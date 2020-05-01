import { Transactions } from "../transactions";

export interface BlockParameters {
  version: number,
  blockNumber: number,
  stateSize: number,
  stateRoot: string,
}

export interface BlockArguments extends BlockParameters {
  hardTransactionsIndex: number,
  transactions: Transactions,
}

export interface Header extends BlockParameters {
  hardTransactionsCount: number,
  transactionsRoot: Buffer
}

export interface Commitment extends Header {
  transactionsHash: string,
  submittedAt: number,
}

export interface BlockType {
  transactionsData: Buffer;
  header: Header;
  commitment: Commitment;
  transactions: Transactions;
  addOutput(submittedAt: number): void;
  blockHash(web3): string;
}
