import { Transactions, Transaction, TransactionsJson } from "../transactions";
import { JsonType } from "../../lib/simple-level";

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

export type CommitmentJson = {
  version: number;
  blockNumber: number;
  stateSize: number;
  stateRoot: string;
  hardTransactionsCount: number;
  transactionsRoot: string;
  transactionsHash: string;
  submittedAt: number;
}

export type BlockJson = {
  commitment: CommitmentJson;
  transactions: TransactionsJson;
}

export type BlockInput = BlockArguments | BlockJson;