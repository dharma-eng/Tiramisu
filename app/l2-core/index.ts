import { EventEmitter } from 'events';
import ParentInterface from "../modules/parent-interface"
import { Transaction, StateMachine, Block } from "../modules";
import { Database } from "../modules/db";
import { TransactionQueue } from "../modules/transactions-queue";

export type Web3Options = {
  peg: any;
  from: string;
  web3: any;
}

export class DharmaL2Core extends EventEmitter {
  private _confirmationTimer: NodeJS.Timeout;
  private maxSoftTransactions = 10;
  private confirmationPeriod = 0;
  private awaitingConfirmation: string[] = [];

  constructor(
    public database: Database,
    public queue: TransactionQueue,
    public parentInterface: ParentInterface,
    private dbPath?: string
  ) {
    super();
    this._confirmationTimer = setTimeout(this.confirmationLoop, 5000);
  }

  static async create(web3: Web3Options, dbPath?: string): Promise<DharmaL2Core> {
    const db = await Database.create(dbPath);
    const queue = new TransactionQueue();
    const parent = new ParentInterface(web3.peg, web3.from, web3.web3);
    return new DharmaL2Core(db, queue, parent, dbPath);
  }

  async confirmationLoop() {
    try {
      if (this.awaitingConfirmation.length) {
        const hash = this.awaitingConfirmation.splice(0, 1)[0];
        const block = await this.database.getBlock(hash);
        const n = await this.parentInterface.currentBlockNumber();
        if (block.commitment.submittedAt + this.confirmationPeriod > n) {
          await this.parentInterface.confirmBlock(block);
          this.emit('block-confirmed', block.blockHash());
        } else {
          this.awaitingConfirmation.unshift(hash);
        }
      }
    } catch(err) {
      console.error(err);
    } finally {
      this._confirmationTimer = setTimeout(this.confirmationLoop, 5000);
    }
  }

  async close() {
    await this.database.close();
  }

  async processBlock(parentHashOrNumber?: string | number, commit?: boolean): Promise<Block> {
    const parentData = await this.database.getBlockOrDefault(parentHashOrNumber);
    const state = await this.database.getState(parentData.stateRoot);
    const stateMachine = new StateMachine(state);
    const encodedHardTransactions = await this.parentInterface.getHardTransactions(parentData.hardTransactionsCount);
    const softTransactions = await this.queue.getTransactions(this.maxSoftTransactions);
    const block = await stateMachine.executeBlock({
      ...parentData,
      hardTransactionsIndex: parentData.hardTransactionsCount,
      encodedHardTransactions,
      softTransactions
    });
    if (commit) {
      await state.commit();
      await this.parentInterface.submitBlock(block);
      await this.database.putBlock(block);
      const hash = block.blockHash();
      this.awaitingConfirmation.push(hash);
      this.emit('block-submitted', hash);
    }
    await state.close();
    return block;
  }
}

export default DharmaL2Core;