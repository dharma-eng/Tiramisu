const Account = require("../types/Account");
const { toHex } = require("../lib/to");

class StateMachine {
  constructor(state) {
    this.state = state;
  }

  async execute({
    hardCreates,
    hardDeposits,
    hardWithdrawals,
    hardAddSigners,
    softWithdrawals,
    softCreates,
    softTransfers,
    softChangeSigners
  }) {
    /* Execute hard deposits. */
    for (let transaction of hardCreates) await this.hardCreate(transaction);

    /* Execute hard deposits. */
    for (let transaction of hardDeposits) await this.hardDeposit(transaction);

    /* Execute hard withdrawals. */
    for (let transaction of hardWithdrawals)
      await this.hardWithdraw(transaction);

    /* Execute hard add signers. */
    for (let transaction of hardAddSigners)
      await this.hardAddSigner(transaction);

    /* Execute soft withdrawals, remove any that are invalid. */
    for (let i = 0; i < softTransfers.length; i++) {
      const transaction = softTransfers[i];
      const res = await this.softTransfer(transaction);
      if (!res) {
        softTransfers.splice(i, 1);
        continue;
      }
    }

    /* Execute soft withdrawals, remove any that are invalid. */
    for (let i = 0; i < softWithdrawals.length; i++) {
      const transaction = softWithdrawals[i];
      const res = await this.softWithdrawal(transaction);
      if (!res) {
        softWithdrawals.splice(i, 1);
        continue;
      }
    }

    /* Execute soft withdrawals, remove any that are invalid. */
    for (let i = 0; i < softChangeSigners.length; i++) {
      const transaction = softChangeSigners[i];
      const res = await this.softChangeSigner(transaction);
      if (!res) {
        softChangeSigners.splice(i, 1);
        continue;
      }
    }
  }

  async hardCreate(transaction) {
    const { accountAddress, initialSigningKey, value } = transaction;
    const account = new Account({
      address: accountAddress,
      nonce: 0,
      balance: value,
      signers: [initialSigningKey]
    });
    const index = await this.state.putAccount(account);
    const stateRoot = await this.state.rootHash();
    transaction.addOutput(index, stateRoot);
    return true;
  }

  async hardDeposit(transaction) {
    const { accountIndex, value } = transaction;
    const account = await this.state.getAccount(accountIndex);
    account.balance += value;
    await this.state.updateAccount(accountIndex, account);
    const stateRoot = await this.state.rootHash();
    transaction.addOutput(accountIndex, stateRoot);
    return true;
  }

  async hardWithdraw(transaction) {
    const { accountIndex, value } = transaction;
    const account = await this.state.getAccount(accountIndex);
    if (!account || transaction.checkValid(account)) {
      const stateRoot = `0x${"00".repeat(20)}`;
      transaction.addOutput(stateRoot);
      return false;
    }
    account.balance -= value;
    await this.state.updateAccount(accountIndex, account);
    const stateRoot = await this.state.rootHash();
    transaction.addOutput(accountIndex, stateRoot);
    return true;
  }

  async hardAddSigner(transaction) {
    const { accountIndex, signingAddress } = transaction;
    const account = await this.state.getAccount(accountIndex);

    if (!account || transaction.checkValid(account)) {
      const stateRoot = `0x${"00".repeat(20)}`;
      transaction.addOutput(stateRoot);
      return false;
    }

    account.addSigner(signingAddress);
    await this.state.updateAccount(accountIndex, account);
    const stateRoot = await this.state.rootHash();
    transaction.addOutput(accountIndex, stateRoot);
    return true;
  }

  async softTransfer(transaction) {
    const { fromAccountIndex, toAccountIndex, value } = transaction;
    const fromAccount = await this.state.getAccount(fromAccountIndex);
    const toAccount = await this.state.getAccount(toAccountIndex);

    /* Verification */
    if (!fromAccount || !toAccount) {
      transaction.reject("Account does not exist.");
      return false;
    }
    const errorMessage = transaction.checkValid(fromAccount);
    if (errorMessage) {
      transaction.reject(errorMessage);
      return false;
    }

    /* Update caller account */
    fromAccount.nonce += 1;
    fromAccount.balance -= value;
    await this.state.updateAccount(fromAccountIndex, fromAccount);

    /* Update receiver */
    toAccount.balance += value;
    await this.state.updateAccount(toAccountIndex, toAccount);
    const root = await this.state.rootHash();

    /* Resolve promise, return success */
    transaction.resolve(root);
    transaction.addOutput(root);
    return true;
  }

  async softWithdrawal(transaction) {
    const { fromAccountIndex, value } = transaction;
    const fromAccount = await this.state.getAccount(fromAccountIndex);

    /* Verification */
    if (!fromAccount) {
      transaction.reject("Account does not exist.");
      return false;
    }
    const errorMessage = transaction.checkValid(fromAccount);
    if (errorMessage) {
      transaction.reject(errorMessage);
      return false;
    }

    /* Update caller account */
    fromAccount.nonce += 1;
    fromAccount.balance -= value;

    /* Update state */
    await this.state.updateAccount(fromAccountIndex, fromAccount);
    const root = await this.state.rootHash();

    /* Resolve promise, return success */
    transaction.resolve(root);
    transaction.addOutput(root);
    return true;
  }

  async softChangeSigner(transaction) {
    const {
      fromAccountIndex,
      modificationCategory,
      signingAddress
    } = transaction;
    const fromAccount = await this.state.getAccount(fromAccountIndex);
    /* Verification */
    if (!fromAccount) {
      transaction.reject("Account does not exist.");
      return false;
    }
    const errorMessage = transaction.checkValid(fromAccount);
    if (errorMessage) {
      transaction.reject(errorMessage);
      return false;
    }

    /* Update caller account */
    fromAccount.nonce += 1;
    if (modificationCategory == 0) fromAccount.addSigner(signingAddress);
    else fromAccount.removeSigner(signingAddress);

    /* Update state */
    await this.state.updateAccount(fromAccountIndex, fromAccount);
    const root = await this.state.rootHash();

    /* Resolve promise, return success */
    transaction.resolve(root);
    transaction.addOutput(root);
    return true;
  }
}

module.exports = StateMachine;
