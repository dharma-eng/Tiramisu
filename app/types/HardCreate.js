const { toBuf, toHex, toInt } = require('../lib/to');

class HardCreate {
  prefix = 0;

  constructor({
    hardTransactionIndex,
    contractAddress,
    signerAddress,
    value
  }) {
    this.hardTransactionIndex = toInt(hardTransactionIndex);
    this.contractAddress = toHex(contractAddress);
    this.signerAddress = toHex(signerAddress);
    this.value = toInt(value);
  }

  /* returns encoded buffer */
  encodeForBlock(accountIndex, intermediateStateRoot) {
    this.accountIndex = accountIndex;
    this.intermediateStateRoot = intermediateStateRoot;
    const txIndex = toBuf(this.hardTransactionIndex, 5);
    const acctIndex = toBuf(accountIndex, 4);
    const value = toBuf(this.value, 7);
    const contractAddress = toBuf(this.contractAddress);
    const signerAddress = toBuf(this.signerAddress);
    const root = toBuf(intermediateStateRoot);
    return Buffer.concat([
      txIndex,
      acctIndex,
      value,
      contractAddress,
      signerAddress,
      root
    ]);
  }

  /* returns prefixed encoded buffer - assumes encodeForBlock has been called */
  encodeForTree(accountIndex, intermediateStateRoot) {
    const prefix = toBuf(this.prefix, 1);
    return Buffer.concat([
      prefix,
      this.encodeForBlock(accountIndex, intermediateStateRoot)
    ])
  }
}

module.exports = HardCreate;