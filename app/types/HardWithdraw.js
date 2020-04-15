const { toBuf, toHex, toInt } = require('../lib/to');

class HardWithdraw {
  get prefix() {
    return 2;
  }

  constructor({
    accountIndex,
    hardTransactionIndex,
    callerAddress,
    value
  }) {
    this.accountIndex = toHex(accountIndex);
    this.hardTransactionIndex = toInt(hardTransactionIndex);
    this.callerAddress = toHex(callerAddress);
    this.value = toInt(value);
  }

  addOutput(intermediateStateRoot) {
    this.intermediateStateRoot = toHex(intermediateStateRoot);
  }

  encode(prefix = false) {
    const txIndex = toBuf(this.hardTransactionIndex, 5);
    const acctIndex = toBuf(this.accountIndex, 4);
    const value = toBuf(this.value, 7);
    const root = toBuf(this.intermediateStateRoot, 32);
    return Buffer.concat([
      prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
      txIndex,
      acctIndex,
      value,
      root
    ]);
  }

  checkValid(account) {
    if (!account.hasSigner(this.callerAddress)) return `Caller not approved for withdrawal.`;
    if (!account.hasSufficientBalance(this.value)) return `Account has insufficient balance for withdrawal.`
  }
}

module.exports = HardWithdraw;