import Block, { Commitment } from "../block";
import { getMerkleRoot, sliceBuffer } from "../../lib";
import {
  ErrorProof,
  TransactionsLengthError,
  HardTransactionsRangeError,
  TransactionsRootError,
  HardTransactionsCountError,
  StateSizeError,
  ProvableError,
  StateRootError,
  HardTransactionsOrderError
} from "./types";
import { TransactionMetadata } from "../transactions";
import { decodeBlockSubmitCalldata, decodeSubmittedBlock } from "./coder";
import { toBuffer } from "ethereumjs-util";
import AuditProofProvider from "./provider";

function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
}

export class BlockAuditor {
  private constructor(private provider: AuditProofProvider) {}

  fail(_error: ErrorProof) {
    throw new ProvableError(_error);
  }

  static async validateBlockInput(
    provider: AuditProofProvider,
    submitCalldata: Buffer,
    blockNumber: number
  ): Promise<{
    block: Block,
    parentBlock: Block
  }> {
    const blockAuditor = new BlockAuditor(provider);
    const blockInput = decodeBlockSubmitCalldata(submitCalldata, blockNumber);
    const buf = toBuffer(blockInput.raw.transactionsData);
    blockAuditor.validateTransactionsLength(blockInput.commitment, buf);
    const block = decodeSubmittedBlock(blockInput);
    const parentBlock = await blockAuditor.provider.getParent(block);
    blockAuditor.validateHardTransactionsRange(parentBlock, block);
    blockAuditor.validateHardTransactionsOrder(block);
    blockAuditor.validateHeader(parentBlock, block);
    return { block, parentBlock };
  }

  validateTransactionsLength(header: Commitment, transactionsData: Buffer) {
    // console .log('Checking size of transactions buffer...')
    const err = { header, transactionsData, _type: 'transactions_length' } as TransactionsLengthError;
    if (transactionsData.byteLength < 16) this.fail(err);
    const metadata = new TransactionMetadata(sliceBuffer(transactionsData, 0, 16));
    const expectedLength = metadata.expectedLength;
    if (transactionsData.length != expectedLength + 16) this.fail(err);
  }

  validateHardTransactionsRange(parentBlock: Block, block: Block) {
    // console .log('Checking hard transactions range...')
    const { header: { hardTransactionsCount }, transactions } = block;
    const hardTransactions = [
      ...transactions.hardCreates,
      ...transactions.hardDeposits,
      ...transactions.hardWithdrawals,
      ...transactions.hardAddSigners
    ];
    const indices = [];
    for (let tx of hardTransactions) {
      if (
        indices.includes(tx.hardTransactionIndex) ||
        tx.hardTransactionIndex >= hardTransactionsCount
      ) this.fail({
        previousHeader: parentBlock.commitment,
        header: block.commitment,
        transactionsData: block.transactionsData,
        _type: 'hard_transactions_range'
      } as HardTransactionsRangeError);
      indices.push(tx.hardTransactionIndex);
    }
  }

  validateHardTransactionsOrder(block: Block) {
    const { transactions } = block;
    for (let key of ['hardCreates', 'hardDeposits', 'hardWithdrawals', 'hardAddSigners']) {
      const txs = transactions[key];
      let lastIndex = 0;
      for (let tx of txs) {
        if (tx.hardTransactionIndex <= lastIndex) {
          this.fail({
            header: block.commitment,
            transactionsData: block.transactionsData,
            _type: 'hard_transactions_order'
          } as HardTransactionsOrderError);
        }
        else lastIndex = tx.hardTransactionIndex;
      }
    }
  }

  validateHeader(parentBlock: Block, block: Block) {
    // console.log(`Checking header...`)
    const { hardTransactionsCount, stateSize } = parentBlock.header;
    const { header, transactions, transactionsArray } = block;
    const transactionsRoot = getMerkleRoot(transactionsArray.map(t => t.encode(true)));
    if (!header.transactionsRoot.equals(transactionsRoot)) {
      this.fail({
        header: block.commitment,
        transactionsData: block.transactionsData,
        _type: 'transactions_root'
      } as TransactionsRootError);
    }
    const meta = TransactionMetadata.fromTransactions(transactions);
    if (
      hardTransactionsCount + meta.hardTransactionsCount
      != header.hardTransactionsCount
    ) {
      this.fail({
        previousHeader: parentBlock.commitment,
        header: block.commitment,
        transactionsData: block.transactionsData,
        _type: 'hard_transactions_count'
      } as HardTransactionsCountError)
    }
    
    const totalCreates = meta.hardCreates + meta.softCreates;
    if (stateSize + totalCreates != header.stateSize) {
      this.fail({
        previousHeader: parentBlock.commitment,
        header: block.commitment,
        transactionsData: block.transactionsData,
        _type: 'state_size'
      } as StateSizeError)
    }
    const lastTransaction = last(transactionsArray);
    if (lastTransaction.intermediateStateRoot != header.stateRoot) {
      this.fail({
        header: block.commitment,
        transactionsData: block.transactionsData,
        _type: 'state_root'
      } as StateRootError);
    }
  }
}

export default BlockAuditor;