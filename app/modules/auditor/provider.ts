import { PreviousStateProof, PreviousRootProof, AccountProof, CommitmentProof, TransactionProof } from "./types";
import { State, StateMachine } from "../state";
import Block from "../block";
import { Database } from "../db";
import ParentInterface from "../parent-interface";

export class AuditProofProvider {
  constructor(private _db: Database, private _parentInterface: ParentInterface) {}

  protected async partialBlockExecute(state: State, block: Block, executeUntil: number) {
    const machine = new StateMachine(state);
    const arr = block.transactionsArray;
    for (let i = 0; i < executeUntil; i++) await machine.executeSingle(arr[i]);
    return state;
  }

  async getPreviousStateProof(
    block: Block,
    // blockNumber: number,
    transactionIndex: number,
    accountIndex: number
  ): Promise<PreviousStateProof> {
    // const block = await this._db.getBlock(blockNumber);
    const blockNumber = block.header.blockNumber;
    let rootProof: PreviousRootProof;
    let accountProof: AccountProof;
    let state = await this._db.getBlockStartingState(blockNumber);
    if (transactionIndex == 0) {
      const previousBlock = await this._db.getBlock(blockNumber - 1);
      rootProof = previousBlock.commitment as CommitmentProof;
    } else {
      rootProof = block.proveTransaction(transactionIndex - 1) as TransactionProof;
      await this.partialBlockExecute(state, block, transactionIndex);
      // const transaction = block.transactionsArray[transactionIndex - 1];
    }
    const merkleProof = await state.getAccountProof(accountIndex);
    accountProof = {
      accountIndex,
      data: merkleProof.value,
      siblings: merkleProof.siblings
    };
    return {
      accountProof,
      previousRootProof: rootProof
    };
  }

  async getParent(block: Block): Promise<Block> {
    const parent = await this._db.getBlock(block.header.blockNumber - 1);
    return parent
  }

  async getHardTransactions(hardTransactionsIndex: number, max?: number): Promise<string[]> {
    return this._parentInterface.getHardTransactions(hardTransactionsIndex, max);
  }

  async getBlockStartingState(blockNumber: number): Promise<State> {
    return this._db.getBlockStartingState(blockNumber);
  }
}

export default AuditProofProvider;