const { toBuf, toHex, toInt } = require("../lib/to");
class HardAddSigner {
  constructor(args) {
    const {
      accountIndex,
      hardTransactionIndex,
      callerAddress,
      signingAddress
    } = args;
    this.accountIndex = toInt(accountIndex);
    this.hardTransactionIndex = toInt(hardTransactionIndex);
    this.callerAddress = toHex(callerAddress);
    this.signingAddress = toHex(signingAddress);
  }
  get prefix() {
    return 3;
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
    if (account.hasSigner(this.signingAddress))
      return `Invalid signing address. Account already has signer ${
        this.signingAddress
      }`;
    if (!(account.address == this.callerAddress)) return `Caller not approved.`;
    if (account.signers.length == 10) return `Account signer array full.`;
  }
  static fromLayer1(hardTransactionIndex, buf) {
    let accountIndex = toInt(toHex(buf.slice(1, 5)));
    let callerAddress = toHex(buf.slice(5, 25));
    let signingAddress = toHex(buf.slice(25));
    return new HardAddSigner({
      hardTransactionIndex,
      accountIndex,
      callerAddress,
      signingAddress
    });
  }
}
module.exports = HardAddSigner;
