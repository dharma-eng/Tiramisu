const Account = require('../types/Account');

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
    const [
      hardCreatesCount,
      hardDepositsCount,
      hardWithdrawalsCount,
      hardAddSignersCount,
      softWithdrawalsCount,
      softCreatesCount,
      softTransfersCount,
      softChangeSignersCount
    ] = [
      hardCreates.length,
      hardDepositCount.length,
      0, 0, 0, 0, 0, 0
    ]

    const leaves = [];
    const buffers = [];
    
    for (let tx of hardCreates) {
      const { treeLeaf, blockBuffer } = await this.hardCreate(tx)
      leaves.push(treeLeaf);
      buffers.push(blockBuffer);
    }
    for (let tx of hardDeposits) {
      const { treeLeaf, blockBuffer } = await this.hardDeposit(tx);
      leaves.push(treeLeaf);
      buffers.push(blockBuffer);
    }
    for (let tx of softTransfers) {
      const res = await this.softTransfer(tx);
      if (!res) continue;
      softTransfersCount++;
      leaves.push(treeLeaf);
      buffers.push(blockBuffer);
    }
    for (let tx of softWithdrawals) {
      const res = await this.softWithdrawal(tx);
      if (!res) continue;
      softWithdrawalsCount++;
      leaves.push(treeLeaf);
      buffers.push(blockBuffer);
    }
  }

  async hardCreate(transaction) {
    const {
      contractAddress,
      signerAddress,
      value
    } = transaction;
    const account = new Account({
      address: contractAddress,
      nonce: 0,
      balance: value,
      signers: [signerAddress]
    });
    const index = await this.state.putAccount(account);
    const stateRoot = await this.state.rootHash();
    return {
      treeLeaf: transaction.encodeForTree(index, stateRoot),
      blockBuffer: transaction.encodeForBlock(index, stateRoot)
    }
  }

  async hardDeposit(transaction) {
    const {
      accountIndex,
      value
    } = transaction;
    const account = await this.state.getAccount(accountIndex);
    account.balance += value;
    await this.state.updateAccount(accountIndex, account);
    const stateRoot = await this.state.rootHash();
    return {
      treeLeaf: transaction.encodeForTree(stateRoot),
      blockBuffer: transaction.encodeForBlock(stateRoot)
    }
  }

  async softTransfer({ transaction, reject, resolve }) {
    const { fromAccountIndex, toAccountIndex, value } = transaction;
    const fromAccount = await this.state.getAccount(fromAccountIndex);
    const toAccount = await this.state.getAccount(toAccountIndex);
    /* Verification */
    if (!fromAccount || !toAccount) {
      reject('Account does not exist.')
      return null;
    }
    const errorMessage = transaction.checkValid(fromAccount);
    if (errorMessage) {
      reject(errorMessage);
      return null;
    }
    /* Update caller */
    fromAccount.nonce += 1;
    fromAccount.balance -= value;
    await this.state.updateAccount(fromAccountIndex, fromAccount);
    /* Update receiver */
    toAccount.balance += value;
    await this.state.updateAccount(toAccountIndex, toAccount);
    const root = await this.state.rootHash();
    resolve(root);
    return {
      treeLeaf: transaction.encodeForTree(stateRoot),
      blockBuffer: transaction.encodeForBlock(stateRoot)
    }
  }

  async softWithdrawal({ transaction, reject, resolve }) {
    const { fromAccountIndex, value } = transaction;
    const fromAccount = await this.state.getAccount(fromAccountIndex);
    if (!fromAccount) {
      reject('Account does not exist.')
      return null;
    }
    const errorMessage = transaction.checkValid(fromAccount);
    if (errorMessage) {
      reject(errorMessage);
      return null;
    }
    /* Update caller */
    fromAccount.nonce += 1;
    fromAccount.balance -= value;
    await this.state.updateAccount(fromAccountIndex, fromAccount);
    const root = await this.state.rootHash();
    resolve(root);
    return {
      treeLeaf: transaction.encodeForTree(stateRoot),
      blockBuffer: transaction.encodeForBlock(stateRoot)
    }
  }
}