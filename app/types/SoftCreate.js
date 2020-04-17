const { toBuf, toHex, toInt } = require("../lib/to");
const {
  ecrecover,
  keccak256,
  ecsign,
  pubToAddress,
  fromRpcSig,
  toRpcSig
} = require("ethereumjs-utils");
class SoftCreate {
  constructor(args) {
    const {
      fromAccountIndex,
      toAccountIndex,
      nonce,
      value,
      contractAddress,
      signingAddress,
      signature,
      privateKey
    } = args;
    this.accountIndex = toInt(fromAccountIndex);
    this.toAccountIndex = toInt(toAccountIndex);
    this.nonce = toInt(nonce);
    this.value = toInt(value);
    this.accountAddress = toHex(contractAddress);
    this.initialSigningKey = toHex(signingAddress);
    let sig = privateKey ? this.sign(privateKey) : signature;
    if (typeof sig == "object") this.signature = toRpcSig(sig.v, sig.r, sig.s);
    else this.signature = toHex(sig);
  }
  get prefix() {
    return 6;
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
    const toIndex = toBuf(this.toAccountIndex, 4);
    const nonce = toBuf(this.nonce, 3);
    const value = toBuf(this.value, 7);
    const contractAddress = toBuf(this.accountAddress, 20);
    const signingAddress = toBuf(this.initialSigningKey, 20);
    const sig = toBuf(this.signature, 65);
    const root = toBuf(this.intermediateStateRoot, 32);
    return Buffer.concat([
      prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
      fromIndex,
      toIndex,
      nonce,
      value,
      contractAddress,
      signingAddress,
      sig,
      root
    ]);
  }
  toMessageHash() {
    const fromIndex = toBuf(this.accountIndex, 4);
    const toIndex = toBuf(this.toAccountIndex, 4);
    const nonce = toBuf(this.nonce, 3);
    const value = toBuf(this.value, 7);
    const msg = Buffer.concat([fromIndex, toIndex, nonce, value]);
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
    if (!account.hasSufficientBalance(this.value))
      return `Insufficient balance. Account has ${account.balance}.`;
  }
}
module.exports = SoftCreate;
