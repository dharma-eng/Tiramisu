const { toBuf, toHex, toInt } = require('../lib/to');

class HardDeposit {
  get prefix() {
    return 1;
  }

  constructor({
    accountIndex,
    hardTransactionIndex,
    contractAddress,
    signerAddress,
    value
  }) {
    this.accountIndex = toHex(accountIndex);
    this.hardTransactionIndex = toInt(hardTransactionIndex);
    // this.contractAddress = toHex(contractAddress);
    // this.signerAddress = toHex(signerAddress);
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
}

module.exports = HardDeposit;