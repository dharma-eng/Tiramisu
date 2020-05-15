import { ErrorProofData, ErrorType } from "./base";
import { TransactionStateProof, PreviousRootProof, AccountProof } from "./inclusion-proofs";
import { Commitment } from "../../block";
import { BufferLike } from "../../../lib";

export type ProofData_HardTransactionSource = {
  header: Commitment;
  transactionIndex: number;
  transaction: BufferLike;
  siblings: BufferLike[];
  previousRootProof?: PreviousRootProof;
  stateProof?: AccountProof;
}

export type HardTransactionSourceError = ErrorType<"hard_transaction_source", ProofData_HardTransactionSource>;

export type TransactionError = HardTransactionSourceError;