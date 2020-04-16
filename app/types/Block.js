const { getMerkleRoot } = require("../lib/merkle");
const { toInt, toBuf, toHex } = require("../lib/to");
const TransactionsMetadata = require("./TransactionMetadata");
const { keccak256 } = require("ethereumjs-utils");

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

class Block {
  constructor({
    version,
    blockNumber,
    stateSize,
    stateRoot,
    hardTransactionsIndex,
    transactions
  }) {
    this.transactions = transactions;

    const transactionsArray = keys.reduce(
      (arr, key) => [...arr, ...transactions[key]],
      []
    );

    /* Encode transactions with their prefixes, calculate merkle root. */
    const leaves = transactionsArray.map(t => t.encode(true));
    const transactionsRoot = getMerkleRoot(leaves);

    /* Encode transactions without their prefixes and concatenate them. Place the encoded metadata at the beginning. */
    const transactionsMetadata = TransactionsMetadata.fromTransactions(
      transactions
    );
    const transactionsBuffer = Buffer.concat(
      transactionsArray.map(t => t.encode(false))
    );
    const transactionsData = Buffer.concat([
      transactionsMetadata.encode(),
      transactionsBuffer
    ]);

    /* Add the hard transactions count from this block to the previous total. */
    const hardTransactionsCount =
      hardTransactionsIndex + transactionsMetadata.hardTransactionsCount;
    this.header = {
      version,
      blockNumber,
      stateSize,
      hardTransactionsCount: hardTransactionsCount,
      stateRoot,
      transactionsRoot
    };
    this.transactionsData = transactionsData;
  }

  addOutput(submittedAt) {
    this.commitment = {
      ...this.header,
      transactionsHash: toHex(keccak256(this.transactionsData)),
      submittedAt
    };
  }

  /* Currently just using ABI for this. */
  blockHash(web3) {
    if (!this.commitment) {
      throw new Error(
        "Blockhash not available! Requires calling `addOutput` with the block number from submission to L1."
      );
    }
    const structDef = {
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
    const data = toBuf(
      web3.eth.abi.encodeParameter(structDef, this.commitment)
    );
    return toHex(keccak256(data));
  }
}

module.exports = Block;
