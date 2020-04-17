const { toBuf, toHex, toInt } = require("../lib/to");
class HardDeposit {
  constructor(args) {
    const { accountIndex, hardTransactionIndex, value } = args;
    this.accountIndex = toInt(accountIndex);
    this.hardTransactionIndex = toInt(hardTransactionIndex);
    this.value = toInt(value);
  }
  get prefix() {
    return 1;
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
  static fromCreate({ hardTransactionIndex, value }, accountIndex) {
    return new HardDeposit({ accountIndex, hardTransactionIndex, value });
  }
}
module.exports = HardDeposit;
