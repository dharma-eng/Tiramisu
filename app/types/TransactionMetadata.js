const { toNonPrefixed, toHex, toInt, toBuf } = require("../lib/to");
const keys = [
  "hardCreates",
  "hardDeposits",
  "hardWithdrawals",
  "hardAddSigners",
  "softWithdrawals",
  "softCreates",
  "softTransfers",
  "softChangeSigners"
];
const objToArray = obj => keys.map(k => obj[k] || 0);
const arrToObject = arr => arr.reduce((o, v, i) => (o[keys[i]] = v), {});
const strToArray = str => /(.{0,4})*/g.exec(toNonPrefixed(str)).map(toInt);
const arrToBuffer = arr => Buffer.concat(arr.map(v => toBuf(v, 2)));
class TransactionMetadata {
  constructor(metadata) {
    this.metadata =
      (typeof metadata == "object" && metadata) ||
      (typeof metadata == "string" && arrToObject(strToArray(metadata))) ||
      (Array.isArray(metadata) && arrToObject(metadata)) ||
      (Buffer.isBuffer(metadata) && arrToObject(strToArray(toHex(metadata))));
  }
  get hardTransactionsCount() {
    return keys
      .slice(0, 4)
      .map(k => this.metadata[k])
      .reduce((a, b) => a + b, 0);
  }
  encode() {
    return arrToBuffer(objToArray(this.metadata));
  }
  static decode(str) {
    return new TransactionMetadata(str);
  }
  static fromTransactions(transactions) {
    return new TransactionMetadata(
      keys.reduce(
        (o, k) =>
          Object.assign(Object.assign({}, o), { [k]: transactions[k].length }),
        {}
      )
    );
  }
}
module.exports = TransactionMetadata;
