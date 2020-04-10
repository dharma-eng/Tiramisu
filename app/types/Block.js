
const { getMerkleRoot } = require('../../utils/merkle');
const { toInt, toBuf, toHex } = require('../lib/to');

class Block {
  constructor({
    transactionCounts,
    transactionBuffers,
    transactionLeaves,
    blockNumber,
    stateSize,
    hardTransactionsIndex,
    stateRoot
  }) {
    const hardTransactionsCount = hardTransactionsIndex + transactionCounts.slice(0, 4).reduce((a, b) => a+b, 0);
    const transactionsMeta = transactionCounts.map(count => toBuf(count, 2));
    const transactionsData = Buffer.concat([
      Buffer.concat(transactionsMeta),
      Buffer.concat(transactionBuffers)
    ]);
    const transactionsRoot = getMerkleRoot(transactionLeaves);
    return {
      header: {
        version,
        blockNumber,
        stateSize,
        hardTransactionsCount,
        stateRoot,
        transactionsRoot
      },
      transactionsData
    }
  }
}

uint16 version;
    uint32 blockNumber;
    uint32 stateSize;
    uint40 hardTransactionCount;
    bytes32 stateRoot;
    bytes32 transactionsRoot;