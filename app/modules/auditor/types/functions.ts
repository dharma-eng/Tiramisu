import { Commitment } from "../../block";
import { BufferLike } from "../../../lib";

export type TransactionErrorLibFunctionName = 'proveHardTransactionSourceError' | 'proveSignatureError';

export type TransactionErrorLibFunctionInput = {
  name: TransactionErrorLibFunctionName;
  data: [
    Commitment, // header
    BufferLike, // transaction
    number, // transactionIndex
    BufferLike[], // siblings
    BufferLike, // previousStateProof
    BufferLike // stateProof
  ]
}

export type BlockErrorLibFunctionName = 'proveStateSizeError' | 'proveStateRootError' | 'proveTransactionsRootError' |
'proveTransactionsDataLengthError' | 'proveHardTransactionsCountError' | 'proveHardTransactionsRangeError' | 'proveHardTransactionsOrderError';

export type BlockErrorLibFunctionInput = {
  name: BlockErrorLibFunctionName;
  data: [
    Commitment, // previousHeader
    Commitment, // header
    BufferLike // transactionsData
  ] | [
    Commitment, // header
    BufferLike // transactionsData
  ]
}

export type ExecutionErrorLibFunctionName = 'proveExecutionError' | 'proveCreateIndexError';

export type ExecutionErrorLibFunctionInput = {
  name: ExecutionErrorLibFunctionName;
  data: [
    Commitment, // previousHeader
    Commitment, // header
    number, // transactionsIndex
    BufferLike // transactionsData
  ] | [
    Commitment, // header
    BufferLike, // transactionStateProof
    BufferLike, // transaction
    BufferLike, // stateProof1
    BufferLike // stateProof2
  ]
}

export type ErrorProofFunctionInput = TransactionErrorLibFunctionInput |
  BlockErrorLibFunctionInput |
  ExecutionErrorLibFunctionInput;