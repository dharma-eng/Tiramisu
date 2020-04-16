var __assign =
  (this && this.__assign) ||
  function() {
    __assign =
      Object.assign ||
      function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
var __spreadArrays =
  (this && this.__spreadArrays) ||
  function() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++)
      s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
      for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
        r[k] = a[j];
    return r;
  };
var getMerkleRoot = require("../lib/merkle").getMerkleRoot;
var _a = require("../lib/to"),
  toBuf = _a.toBuf,
  toHex = _a.toHex;
var TransactionsMetadata = require("./TransactionMetadata");
var keccak256 = require("ethereumjs-utils").keccak256;
var keys = [
  "hardCreates",
  "hardDeposits",
  "hardWithdrawals",
  "hardAddSigners",
  "softWithdrawals",
  "softCreates",
  "softTransfers",
  "softChangeSigners"
];
var Block = /** @class */ (function() {
  function Block(args) {
    var version = args.version,
      blockNumber = args.blockNumber,
      stateSize = args.stateSize,
      stateRoot = args.stateRoot,
      hardTransactionsIndex = args.hardTransactionsIndex,
      transactions = args.transactions;
    this.transactions = transactions;
    var transactionsArray = keys.reduce(function(arr, key) {
      return __spreadArrays(arr, transactions[key]);
    }, []); //TODO: make transaction type that accepts all types of transactions
    /* Encode transactions with their prefixes, calculate merkle root. */
    var leaves = transactionsArray.map(function(t) {
      return t.encode(true);
    });
    var transactionsRoot = getMerkleRoot(leaves);
    /* Encode transactions without their prefixes and concatenate them. Place the encoded metadata at the beginning. */
    var transactionsMetadata = TransactionsMetadata.fromTransactions(
      transactions
    );
    var transactionsBuffer = Buffer.concat(
      transactionsArray.map(function(t) {
        return t.encode(false);
      })
    );
    var transactionsData = Buffer.concat([
      transactionsMetadata.encode(),
      transactionsBuffer
    ]);
    /* Add the hard transactions count from this block to the previous total. */
    var hardTransactionsCount =
      hardTransactionsIndex + transactionsMetadata.hardTransactionsCount;
    this.header = {
      version: version,
      blockNumber: blockNumber,
      stateSize: stateSize,
      hardTransactionsCount: hardTransactionsCount,
      stateRoot: stateRoot,
      transactionsRoot: transactionsRoot
    };
    this.transactionsData = transactionsData;
  }
  Block.prototype.addOutput = function(submittedAt) {
    this.commitment = __assign(__assign({}, this.header), {
      transactionsHash: toHex(keccak256(this.transactionsData)),
      submittedAt: submittedAt
    });
  };
  /* Currently just using ABI for this. */
  Block.prototype.blockHash = function(web3) {
    if (!this.commitment) {
      throw new Error(
        "Blockhash not available! Requires calling `addOutput` with the block number from submission to L1."
      );
    }
    var structDef = {
      BlockHeader: {
        version: "uint16",
        blockNumber: "uint32",
        stateSize: "uint32",
        stateRoot: "bytes32",
        hardTransactionsCount: "uint40",
        transactionsRoot: "bytes32",
        transactionsHash: "bytes32",
        submittedAt: "uint256"
      }
    };
    var data = toBuf(web3.eth.abi.encodeParameter(structDef, this.commitment));
    return toHex(keccak256(data));
  };
  return Block;
})();
module.exports = Block;
