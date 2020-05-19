import { Commitment } from "../../block";
import { ErrorType, ErrorProofData, With_Parent, With_Transactions } from './base';


export type ProofData_StateSize = ErrorProofData & With_Parent & With_Transactions;
export type ProofData_StateRoot = ErrorProofData & With_Transactions;
export type ProofData_TransactionsRoot = ErrorProofData & With_Transactions;
export type ProofData_HardTransactionsCount = ErrorProofData & With_Parent & With_Transactions;
export type ProofData_TransactionsLength = ErrorProofData & With_Transactions;
export type ProofData_HardTransactionsRange = ErrorProofData & With_Parent & With_Transactions;
export type ProofData_HardTransactionsOrder = ErrorProofData & With_Transactions;

export type StateSizeError = ErrorType<"state_size", ProofData_StateSize>;
export type StateRootError = ErrorType<"state_root", ProofData_StateRoot>;
export type TransactionsRootError = ErrorType<"transactions_root", ProofData_TransactionsRoot>;
export type HardTransactionsCountError = ErrorType<"hard_transactions_count", ProofData_HardTransactionsCount>;
export type HardTransactionsRangeError = ErrorType<"hard_transactions_range", ProofData_HardTransactionsRange>;
export type HardTransactionsOrderError = ErrorType<"hard_transactions_order", ProofData_HardTransactionsOrder>;
export type TransactionsLengthError = ErrorType<"transactions_length", ProofData_TransactionsLength>;

export type BlockError = StateSizeError | StateRootError | TransactionsRootError | HardTransactionsCountError |
  HardTransactionsRangeError | HardTransactionsOrderError | TransactionsLengthError;