import { ErrorProofData, ErrorType } from "./base";
import { TransactionStateProof, PreviousRootProof } from "./inclusion-proofs";
import { Commitment } from "../../block";
import { BufferLike } from "../../../lib";
import { AccountProof } from "../../state";

// Works for both signature and hard transaction
export type ProofData_TransactionSource = {
  header: Commitment;
  transactionIndex: number;
  transaction: BufferLike;
  siblings: BufferLike[];
  previousRootProof?: PreviousRootProof;
  stateProof?: AccountProof;
}

export type HardTransactionSourceError = ErrorType<"hard_transaction_source", ProofData_TransactionSource>;
export type TransactionSignatureError = ErrorType<"transaction_signature", ProofData_TransactionSource>;


export type TransactionError = HardTransactionSourceError | TransactionSignatureError;