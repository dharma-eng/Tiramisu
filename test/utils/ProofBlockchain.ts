import { getMerkleProof, toHex, Blockchain, Block, getMerkleRoot, Transactions, Transaction, transactionsToArray } from '../../app';
const ABI = require('web3-eth-abi');

export type BlockProofOptions = {
  accountIndex: number;
  transactionIndex: number;
  transactionMutator?: (transaction: Transaction) => Buffer;
}

export type BlockProofOutput = {
  block: Block;
  accountProof: string | Buffer;
  previousStateProof: string | Buffer;
  transactionProof: Array<string | Buffer>;
  transactionData: string | Buffer;
}

export function encodeAccountProof(accountIndex, data, siblings): string {
  return ABI.encodeParameter(
    {
      'StateProof': {
        'data': 'bytes',
        'accountIndex': 'uint256',
        'siblings': 'bytes32[]'
      }
    },
    {accountIndex, data, siblings}
  );
}

export function encodeTransactionProof(proof: {
  transactionData: string | Buffer,
  siblings: Array<string | Buffer>
}): string {
  return ABI.encodeParameter(
    {
      'TransactionProof': {
        'transactionData': 'bytes',
        'siblings': 'bytes32[]'
      }
    },
    {
      transactionData: toHex(proof.transactionData),
      siblings: proof.siblings.map(toHex)
    }
  );
}

export class ProofBlockchain extends Blockchain {
  /**
   * Currently only works for proofs of previous transaction, not last block.
   */
  async processBlockForProof(options: BlockProofOptions): Promise<BlockProofOutput> {
    const { accountIndex, transactionIndex, transactionMutator } = options;
    const { hardTransactionsIndex, stateMachine: machine, version } = this;
  
    const transactions = await this.getTransactions();
    const txArray = transactionsToArray(transactions);
    let accountProof;
    const previousIndex = transactionIndex - 1;

    for (let i = 0; i < txArray.length; i++) {
      let transaction = txArray[i];
      await machine.executeSingle(transaction);
      if (i == previousIndex) {
        const stateProof = await machine.state.getAccountProof(accountIndex);
        accountProof = encodeAccountProof(accountIndex, toHex(stateProof.value), stateProof.siblings.map(toHex));
      }
    }

    const stateSize = this.state.size;
    const stateRoot = await this.state.rootHash();
    
    const block = new Block({
      version,
      blockNumber: this.blockNumber,
      stateSize,
      stateRoot,
      hardTransactionsIndex,
      transactions
    });

    const leaves = txArray.map(tx => tx.encode(true));

    if (transactionMutator) {
      leaves[transactionIndex] = transactionMutator(txArray[transactionIndex])
      block.header.transactionsRoot = getMerkleRoot(leaves);
    }

    this.blockNumber += 1;
    this.hardTransactionsIndex = block.header.hardTransactionsCount;

    const previousStateProof = encodeTransactionProof({
      transactionData: leaves[previousIndex],
      siblings: getMerkleProof(leaves, previousIndex).siblings
    });
  
    const transactionProof = getMerkleProof(leaves, transactionIndex).siblings;

    return {
      block,
      accountProof,
      previousStateProof,
      transactionProof,
      transactionData: leaves[transactionIndex]
    };
  }
}
