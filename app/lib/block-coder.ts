import { encodeTransactions } from "./transactions-coder";
import { Transactions } from "../modules/transactions";

interface BlockArguments {
  version: number;
  blockNumber: number;
  stateSize: number;
  stateRoot: string;
  hardTransactionsIndex: number;
  transactions: Transactions;
}

const last = <T = any>(arr: T[]): T => arr[arr.length - 1];

export function encodeBlock(args: BlockArguments) {
  const { transactions, hardTransactionsIndex, ...headerArgs } = args;
  const { metadata, transactionsData, transactionsRoot, transactionsArray } = encodeTransactions(transactions);
  const hardTransactionsCount = hardTransactionsIndex + metadata.hardTransactionsCount;
  const stateRoot = last(transactionsArray).intermediateStateRoot;
  
  return {
    header: {
      ...headerArgs,
      hardTransactionsCount,
      transactionsRoot,
      stateRoot
    },
    transactionsData
  };
}
