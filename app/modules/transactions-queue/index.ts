import { Transaction } from "../transactions";

export interface TransactionQueue {
  getTransactions(max: number): Transaction[];
  queueTransaction(transaction: Transaction): Promise<any>;
}

export class TransactionQueue {
  private queue: Transaction[];

  getTransactions(max: number): Transaction[] {
    return this.queue.splice(0, max);
  }

  queueTransaction(transaction: Transaction): Promise<any> {
    return new Promise(async (resolve, reject) => {
        transaction.assignResolvers(resolve, reject);
        this.queue.push(transaction);
    });
  }
}