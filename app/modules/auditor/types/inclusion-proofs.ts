import { BufferLike } from "../../../lib"
import { Commitment } from "../../block";
import { AccountProof } from "../../state";

export type TransactionProof = {
  _type: 'txProof';
  transaction: BufferLike;
  siblings: BufferLike[];
}

export type CommitmentProof = Commitment & { _type: 'commitment' }

export type PreviousRootProof = CommitmentProof | TransactionProof;

export type PreviousStateProof = {
  stateProof: AccountProof;
  previousRootProof: PreviousRootProof;
}

export type TransactionStateProof = {
  header: Commitment;
  transactionIndex: number;
  transaction: BufferLike;
  siblings: BufferLike[];
  previousRootProof: PreviousRootProof;
};