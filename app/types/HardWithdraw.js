const { toBuf, toHex, toInt } = require("../lib/to");

class HardWithdraw {
  get prefix() {
    return 2;
  }

  constructor({ accountIndex, hardTransactionIndex, callerAddress, value }) {
    this.accountIndex = toInt(accountIndex);
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
    const withdrawalAddress = toBuf(this.callerAddress, 20);
    const value = toBuf(this.value, 7);
    const root = toBuf(this.intermediateStateRoot, 32);
    return Buffer.concat([
      prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
      txIndex,
      acctIndex,
      withdrawalAddress,
      value,
      root
    ]);
  }

  checkValid(account) {
    if (!account.address == this.callerAddress)
      return `Caller not approved for withdrawal.`;
    if (!account.hasSufficientBalance(this.value))
      return `Account has insufficient balance for withdrawal.`;
  }

  static fromLayer1(hardTransactionIndex, buf) {
    let accountIndex = toHex(buf.slice(1, 5));
    let callerAddress = toHex(buf.slice(5, 25));
    let value = toInt(toHex(buf.slice(25)));
    return new HardWithdraw({
      accountIndex,
      hardTransactionIndex,
      callerAddress,
      value
    });
  }
}

module.exports = HardWithdraw;
