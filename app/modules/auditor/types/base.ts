import { Commitment } from "../../block";

export type ErrorProofData = { header: Commitment };
export type With_Parent = { previousHeader: Commitment };
export type With_Transactions = { transactionsData: Buffer };

/**
 * @param N Name of error type
 * @param P Type of proof data.
 */
export type ErrorType<
  ErrorName,
  ProofDataType extends ErrorProofData = ErrorProofData
> = ProofDataType & {
  _type: ErrorName;
}