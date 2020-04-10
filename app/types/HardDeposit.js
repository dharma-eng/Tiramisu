const { toBuf, toHex, toInt } = require('../lib/to');

class HardDeposit {
  prefix = 1;

  constructor({
    accountIndex,
    hardTransactionIndex,
    contractAddress,
    signerAddress,
    value
  }) {
    this.accountIndex = toHex(accountIndex);
    this.hardTransactionIndex = toInt(hardTransactionIndex);
    this.contractAddress = toHex(contractAddress);
    this.signerAddress = toHex(signerAddress);
    this.value = toInt(value);
  }

  /* returns encoded buffer */
  encodeForBlock(intermediateStateRoot) {
    this.intermediateStateRoot = intermediateStateRoot;
    const txIndex = toBuf(this.hardTransactionIndex, 5);
    const acctIndex = toBuf(this.accountIndex, 4);
    const value = toBuf(this.value, 7);
    const root = toBuf(intermediateStateRoot);
    return Buffer.concat([
      txIndex,
      acctIndex,
      value,
      root
    ]);
  }

  /* returns prefixed encoded buffer - assumes encodeForBlock has been called */
  encodeForTree(intermediateStateRoot) {
    const prefix = toBuf(this.prefix, 1);
    return Buffer.concat([
      prefix,
      this.encodeForBlock(this.accountIndex, intermediateStateRoot)
    ])
  }
}

module.exports = HardDeposit;