const { toBuf, toHex, toInt } = require("../lib/to");
class HardCreate {
  constructor(args) {
    const {
      hardTransactionIndex,
      contractAddress,
      signerAddress,
      value
    } = args;
    this.hardTransactionIndex = toInt(hardTransactionIndex);
    this.accountAddress = toHex(contractAddress);
    this.initialSigningKey = toHex(signerAddress);
    this.value = toInt(value);
  }
  get prefix() {
    return 0;
  }
  addOutput(intermediateStateRoot, accountIndex) {
    this.accountIndex = toInt(accountIndex);
    this.intermediateStateRoot = toHex(intermediateStateRoot);
  }
  encode(prefix = false) {
    const txIndex = toBuf(this.hardTransactionIndex, 5);
    const acctIndex = toBuf(this.accountIndex, 4);
    const value = toBuf(this.value, 7);
    const contractAddress = toBuf(this.accountAddress);
    const signerAddress = toBuf(this.initialSigningKey);
    const root = toBuf(this.intermediateStateRoot);
    return Buffer.concat([
      prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
      txIndex,
      acctIndex,
      value,
      contractAddress,
      signerAddress,
      root
    ]);
  }
  static fromLayer1(hardTransactionIndex, buf) {
    let contractAddress = toHex(buf.slice(1, 21));
    let signerAddress = toHex(buf.slice(21, 41));
    let value = toInt(toHex(buf.slice(41)));
    return new HardCreate({
      hardTransactionIndex,
      contractAddress,
      signerAddress,
      value
    });
  }
}
module.exports = HardCreate;
