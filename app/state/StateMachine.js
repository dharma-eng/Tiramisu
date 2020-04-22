var __awaiter =
  (this && this.__awaiter) ||
  function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function(resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
const Account = require("../types/Account");
const { toHex } = require("../lib/to");
class StateMachine {
  constructor(state) {
    this.state = state;
  }
  execute(transactions) {
    return __awaiter(this, void 0, void 0, function*() {
      const {
        hardCreates,
        hardDeposits,
        hardWithdrawals,
        hardAddSigners,
        softWithdrawals,
        softCreates,
        softTransfers,
        softChangeSigners
      } = transactions;
      /* Execute hard deposits. */
      for (let transaction of hardCreates) yield this.hardCreate(transaction);
      /* Execute hard deposits. */
      for (let transaction of hardDeposits) yield this.hardDeposit(transaction);
      /* Execute hard withdrawals. */
      for (let transaction of hardWithdrawals)
        yield this.hardWithdraw(transaction);
      /* Execute hard add signers. */
      for (let transaction of hardAddSigners)
        yield this.hardAddSigner(transaction);
      /* Execute soft withdrawals, remove any that are invalid. */
      for (let i = 0; i < softTransfers.length; i++) {
        const transaction = softTransfers[i];
        const res = yield this.softTransfer(transaction);
        if (!res) {
          softTransfers.splice(i, 1);
        }
      }
      /* Execute soft withdrawals, remove any that are invalid. */
      for (let i = 0; i < softWithdrawals.length; i++) {
        const transaction = softWithdrawals[i];
        const res = yield this.softWithdrawal(transaction);
        if (!res) {
          softWithdrawals.splice(i, 1);
        }
      }
      /* Execute soft withdrawals, remove any that are invalid. */
      for (let i = 0; i < softChangeSigners.length; i++) {
        const transaction = softChangeSigners[i];
        const res = yield this.softChangeSigner(transaction);
        if (!res) {
          softChangeSigners.splice(i, 1);
        }
      }
      /* Execute soft creates, remove any that are invalid. */
      for (let i = 0; i < softCreates.length; i++) {
        const transaction = softCreates[i];
        const res = yield this.softCreate(transaction);
        if (!res) {
          softCreates.splice(i, 1);
        }
      }
    });
  }
  hardCreate(transaction) {
    return __awaiter(this, void 0, void 0, function*() {
      const { accountAddress, initialSigningKey, value } = transaction;
      const account = new Account({
        address: accountAddress,
        nonce: 0,
        balance: value,
        signers: [initialSigningKey]
      });
      const index = yield this.state.putAccount(account);
      const stateRoot = yield this.state.rootHash();
      transaction.addOutput(stateRoot, index);
      return true;
    });
  }
  hardDeposit(transaction) {
    return __awaiter(this, void 0, void 0, function*() {
      const { accountIndex, value } = transaction;
      const account = yield this.state.getAccount(accountIndex);
      account.balance += value;
      yield this.state.updateAccount(accountIndex, account);
      const stateRoot = yield this.state.rootHash();
      transaction.addOutput(stateRoot, accountIndex);
      return true;
    });
  }
  hardWithdraw(transaction) {
    return __awaiter(this, void 0, void 0, function*() {
      const { accountIndex, value } = transaction;
      const account = yield this.state.getAccount(accountIndex);
      if (!account || transaction.checkValid(account)) {
        const stateRoot = `0x${"00".repeat(20)}`;
        transaction.addOutput(stateRoot);
        return false;
      }
      account.balance -= value;
      yield this.state.updateAccount(accountIndex, account);
      const stateRoot = yield this.state.rootHash();
      transaction.addOutput(stateRoot, accountIndex);
      return true;
    });
  }
  hardAddSigner(transaction) {
    return __awaiter(this, void 0, void 0, function*() {
      const { accountIndex, signingAddress } = transaction;
      const account = yield this.state.getAccount(accountIndex);
      if (!account || transaction.checkValid(account)) {
        const stateRoot = `0x${"00".repeat(20)}`;
        transaction.addOutput(stateRoot);
        return false;
      }
      account.addSigner(signingAddress);
      yield this.state.updateAccount(accountIndex, account);
      const stateRoot = yield this.state.rootHash();
      transaction.addOutput(stateRoot, accountIndex);
      return true;
    });
  }
  softTransfer(transaction) {
    return __awaiter(this, void 0, void 0, function*() {
      const { accountIndex, toAccountIndex, value } = transaction;
      const fromAccount = yield this.state.getAccount(accountIndex);
      const toAccount = yield this.state.getAccount(toAccountIndex);
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
      yield this.state.updateAccount(accountIndex, fromAccount);
      /* Update receiver */
      toAccount.balance += value;
      yield this.state.updateAccount(toAccountIndex, toAccount);
      const root = yield this.state.rootHash();
      /* Resolve promise, return success */
      transaction.resolve(root);
      transaction.addOutput(root);
      return true;
    });
  }
  softWithdrawal(transaction) {
    return __awaiter(this, void 0, void 0, function*() {
      const { accountIndex, value } = transaction;
      const fromAccount = yield this.state.getAccount(accountIndex);
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
      yield this.state.updateAccount(accountIndex, fromAccount);
      const root = yield this.state.rootHash();
      /* Resolve promise, return success */
      transaction.resolve(root);
      transaction.addOutput(root);
      return true;
    });
  }
  softChangeSigner(transaction) {
    return __awaiter(this, void 0, void 0, function*() {
      const {
        accountIndex,
        modificationCategory,
        signingAddress
      } = transaction;
      const fromAccount = yield this.state.getAccount(accountIndex);
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
      yield this.state.updateAccount(accountIndex, fromAccount);
      const root = yield this.state.rootHash();
      /* Resolve promise, return success */
      transaction.resolve(root);
      transaction.addOutput(root);
      return true;
    });
  }
  softCreate(transaction) {
    return __awaiter(this, void 0, void 0, function*() {
      const {
        accountIndex,
        accountAddress,
        initialSigningKey,
        value
      } = transaction;
      const fromAccount = yield this.state.getAccount(accountIndex);
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
      yield this.state.updateAccount(accountIndex, fromAccount);
      /* Create receiver */
      const account = new Account({
        address: accountAddress,
        nonce: 0,
        balance: value,
        signers: [initialSigningKey]
      });
      const index = yield this.state.putAccount(account);
      const root = yield this.state.rootHash();
      /* Resolve promise, return success */
      transaction.resolve(root);
      transaction.addOutput(root);
      return true;
    });
  }
}
module.exports = StateMachine;
