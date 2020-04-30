import { encodeTransactions } from "./transactions-coder";
import { Transactions } from "../types/TransactionInterfaces";

interface BlockArguments {
  version: number;
  blockNumber: number;
  stateSize: number;
  stateRoot: string;
  hardTransactionsIndex: number;
  transactions: Transactions;
}

export function encodeBlock(args: BlockArguments) {
  const { transactions, hardTransactionsIndex, ...headerArgs } = args;
  const { metadata, transactionsData, transactionsRoot, transactionsArray } = encodeTransactions(transactions);
  const hardTransactionsCount = hardTransactionsIndex + metadata.hardTransactionsCount;
  let stateRoot;
  for (let i = transactionsArray.length - 1; i >= 0; i--) {
    const tx = transactionsArray[i];
    if (tx.intermediateStateRoot != `0x${"00".repeat(32)}`) {
      stateRoot = tx.intermediateStateRoot;
      break;
    }
  }
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