var toBuffer = require("ethereumjs-utils").toBuffer;
var _a = require("../lib/to"),
  toInt = _a.toInt,
  toBuf = _a.toBuf,
  toHex = _a.toHex;
var Account = /** @class */ (function() {
  function Account(args) {
    var address = args.address,
      /* hex string */ nonce = args.nonce,
      /* number */ balance = args.balance,
      /* number */ signers = args.signers; /* array of hex strings */
    this.address = toHex(address);
    this.nonce = toInt(nonce);
    this.balance = toInt(balance);
    this.signers = signers.map(toHex);
  }
  Account.prototype.addSigner = function(address) {
    this.signers.push(toHex(address));
  };
  Account.prototype.removeSigner = function(address) {
    var addr = toHex(address).toLowerCase();
    var signerIndex = this.signers
      .map(function(s) {
        return s.toLowerCase();
      })
      .indexOf(addr);
    this.signers.splice(signerIndex, 1);
  };
  /* outputs buffer */
  Account.prototype.encode = function() {
    var address = toBuf(this.address, 20);
    var nonce = toBuf(this.nonce, 3);
    var balance = toBuf(this.balance, 7);
    var signerString = "";
    for (var _i = 0, _a = this.signers; _i < _a.length; _i++) {
      var signer = _a[_i];
      var s = signer.slice(0, 2) == "0x" ? signer.slice(2) : signer;
      signerString = "" + signerString + s;
    }
    var signers = toBuf("0x" + signerString);
    return Buffer.concat([address, nonce, balance, signers]);
  };
  /* takes buffer or string, outputs account */
  Account.decode = function(_account) {
    var account = Buffer.isBuffer(_account) ? _account : toBuffer(_account);
    var address = toHex(account.slice(0, 20));
    var nonce = toInt(account.slice(20, 23));
    var balance = toInt(account.slice(23, 30));
    var signerCount = (account.length - 30) / 20;
    var signers = [];
    for (var i = 0; i < signerCount; i++) {
      var ptr = 30 + i * 20;
      var signer = toHex(account.slice(ptr, ptr + 20));
      signers.push(signer);
    }
    return new Account({
      address: address,
      nonce: nonce,
      balance: balance,
      signers: signers
    });
  };
  Account.prototype.hasSigner = function(_address) {
    var address = toHex(_address).toLowerCase();
    return (
      this.signers.filter(function(s) {
        return s.toLowerCase() == address;
      }).length > 0
    );
  };
  Account.prototype.checkNonce = function(nonce) {
    return toInt(nonce) == this.nonce;
  };
  Account.prototype.hasSufficientBalance = function(value) {
    return this.balance >= toInt(value);
  };
  return Account;
})();
module.exports = Account;
