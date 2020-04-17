const { toBuf, toHex, toInt } = require("../lib/to");
const {
  ecrecover,
  keccak256,
  ecsign,
  pubToAddress,
  fromRpcSig,
  toRpcSig
} = require("ethereumjs-utils");
class SoftChangeSigner {
  constructor(args) {
    const {
      fromAccountIndex,
      nonce,
      signingAddress,
      modificationCategory,
      signature,
      privateKey
    } = args;
    this.accountIndex = toInt(fromAccountIndex);
    this.nonce = toInt(nonce);
    this.signingAddress = toHex(signingAddress);
    this.modificationCategory = toInt(modificationCategory);
    let sig = privateKey ? this.sign(privateKey) : signature;
    if (typeof sig == "object") this.signature = toRpcSig(sig.v, sig.r, sig.s);
    else this.signature = toHex(sig);
  }
  get prefix() {
    return 7;
  }
  assignResolvers(resolve, reject) {
    this.resolve = resolve;
    this.reject = reject;
  }
  addOutput(intermediateStateRoot) {
    this.intermediateStateRoot = toHex(intermediateStateRoot);
  }
  encode(prefix = false) {
    const fromIndex = toBuf(this.accountIndex, 4);
    const nonce = toBuf(this.nonce, 3);
    const signingAddress = toBuf(this.signingAddress, 20);
    const modificationCategory = toBuf(this.modificationCategory, 1);
    const sig = toBuf(this.signature, 65);
    const root = toBuf(this.intermediateStateRoot, 32);
    return Buffer.concat([
      prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
      fromIndex,
      nonce,
      signingAddress,
      modificationCategory,
      sig,
      root
    ]);
  }
  toMessageHash() {
    const fromIndex = toBuf(this.accountIndex, 4);
    const nonce = toBuf(this.nonce, 3);
    const signingAddress = toBuf(this.signingAddress, 20);
    const modificationCategory = toBuf(this.modificationCategory, 1);
    const msg = Buffer.concat([
      fromIndex,
      nonce,
      signingAddress,
      modificationCategory
    ]);
    return keccak256(msg);
  }
  sign(privateKey) {
    const msgHash = this.toMessageHash();
    return ecsign(msgHash, privateKey);
  }
  getSignerAddress() {
    const msgHash = this.toMessageHash();
    const { v, r, s } = fromRpcSig(this.signature);
    try {
      const publicKey = ecrecover(msgHash, v, r, s);
      return toHex(pubToAddress(publicKey, true));
    } catch (err) {
      console.log(err);
      return null;
    }
  }
  checkValid(account) {
    const signer = this.getSignerAddress();
    if (!(signer && account.hasSigner(signer))) return "Invalid signature.";
    if (!account.checkNonce(this.nonce))
      return `Invalid nonce. Expected ${account.nonce}`;
    if (this.modificationCategory == 0) {
      /* Add signer */
      if (account.hasSigner(this.signingAddress))
        return `Invalid signing address. Account already has signer ${
          this.signingAddress
        }`;
      if (account.signers.length == 10) return `Account signer array full.`;
    } else {
      /* Remove signer */
      if (!account.hasSigner(this.signingAddress))
        return `Invalid signing address. Account does not have signer ${
          this.signingAddress
        }`;
      if (account.signers.length == 1)
        return `Can not remove last signer from account.`;
    }
  }
}
module.exports = SoftChangeSigner;
