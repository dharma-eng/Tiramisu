const { toBuf, toHex, toInt } = require('../lib/to');
const { ecrecover, keccak256, ecsign, pubToAddress } = require('ethereumjs-utils')

class SoftTransfer {
  prefix = 6;

  constructor({
    fromAccountIndex,
    toAccountIndex,
    nonce,
    value,
    signature,
  }) {
    this.fromAccountIndex = toInt(fromAccountIndex);
    this.toAccountIndex = toInt(toAccountIndex);
    this.nonce = toInt(nonce);
    this.value = toInt(value);
    if (typeof signature == 'object') {
      const sig = toHex(Buffer.concat([
        toBuf(signature.r, 32),
        toBuf(signature.s, 32),
        toBuf(signature.v, 1),
      ]))
      this.signature = sig;

    } else {
      this.signature = toHex(signature);
    }
  }

  encodeForBlock(intermediateStateRoot) {
    const fromIndex = toBuf(this.fromAccountIndex, 4);
    const toIndex = toBuf(this.toAccountIndex, 4);
    const nonce = toBuf(this.nonce, 3);
    const value = toBuf(this.value, 7);
    const sig = toBuf(this.signature, 65);
    const root = toBuf(intermediateStateRoot);
    return Buffer.concat([
      fromIndex,
      toIndex,
      nonce,
      value,
      sig,
      root
    ]);
  }

  encodeForTree(intermediateStateRoot) {
    const prefix = toBuf(this.prefix, 1);
    return Buffer.concat([
      prefix,
      this.encodeForBlock(intermediateStateRoot)
    ])
  }

  toMessageHash() {
    const fromIndex = toBuf(this.fromAccountIndex, 4);
    const toIndex = toBuf(this.toAccountIndex, 4);
    const nonce = toBuf(this.nonce, 3);
    const value = toBuf(this.value, 7);
    const msg = Buffer.concat([
      fromIndex,
      toIndex,
      nonce,
      value
    ]);
    return keccak256(msg);
  }

  sign(privateKey) {
    const msgHash = this.toMessageHash();
    return ecsign(msgHash, privateKey);
  }

  getSignerAddress() {
    const msgHash = this.toMessageHash();
    const r = this.signature.slice(0, 64);
    const s = this.signature.slice(64, 128);
    const v = this.signature.slice(128);
    try {
      const publicKey = ecrecover(msgHash, v, r, s);
      return toHex(pubToAddress(publicKey));
    } catch(err) {
      return null;
    }
  }

  checkValid(account) {
    const signer = this.getSignerAddress();
    if (!(signer && account.hasSigner(signer))) return 'Invalid signature.'
    if (!account.hasNonce(this.nonce)) return `Invalid nonce. Expected ${account.nonce}`;
    if (!account.hasSufficientBalance(this.value)) return `Insufficient balance. Account has ${account.balance}.`;
  }
}

module.exports = SoftTransfer;