const { toBuf, toHex, toInt } = require('../lib/to');

class HardAddSigner {
  get prefix() {
    return 3;
  }

  constructor({
    accountIndex,
    hardTransactionIndex,
    signingAddress,
  }) {
    this.accountIndex = toHex(accountIndex);
    this.hardTransactionIndex = toInt(hardTransactionIndex);
    this.signingAddress = toHex(signingAddress);
    // this.contractAddress = toHex(contractAddress);
    // this.signerAddress = toHex(signerAddress);
  }

  addOutput(intermediateStateRoot) {
    this.intermediateStateRoot = toHex(intermediateStateRoot);
  }

  encode(prefix = false) {
    const txIndex = toBuf(this.hardTransactionIndex, 5);
    const acctIndex = toBuf(this.accountIndex, 4);
    const signingAddress = toBuf(this.signingAddress, 20);
    const root = toBuf(this.intermediateStateRoot, 32);
    return Buffer.concat([
      prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
      txIndex,
      acctIndex,
      signingAddress,
      root
    ]);
  }

  checkValid(account) {
    if (account.hasSigner(this.signingAddress)) return `Invalid signing address. Account already has signer ${this.signingAddress}`;
    if (account.signers.length == 10) return `Account signer array full.`;
  }
}

module.exports = HardAddSigner;