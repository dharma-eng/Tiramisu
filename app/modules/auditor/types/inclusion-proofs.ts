import { BufferLike } from "../../../lib"
import { Commitment } from "../../block";

export type AccountProof = {
  accountIndex: number;
  data: BufferLike;
  siblings: BufferLike[];
}

export type TransactionProof = {
  _type: 'txProof';
  transaction: BufferLike;
  siblings: BufferLike[];
}

export type CommitmentProof = Commitment & { _type: 'commitment' }

export type PreviousRootProof = CommitmentProof | TransactionProof;

export type PreviousStateProof = {
  accountProof: AccountProof;
  previousRootProof: PreviousRootProof;
}

export type TransactionStateProof = {
  header: Commitment;
  transactionIndex: number;
  transaction: BufferLike;
  siblings: BufferLike[];
  previousRootProof: PreviousRootProof;
};