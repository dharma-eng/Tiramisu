import { ErrorProof } from "./types";
import { encodeAccountProof, encodeTransactionStateProof, encodePreviousRootProof } from './coder';
import { BufferLike } from "../../lib";
import { Commitment } from "../block";
import { ErrorProofFunctionInput, BlockErrorLibFunctionName } from "./types/functions";

const blockErrorNamesMap = {
  hard_transactions_count: 'proveHardTransactionsCountError',
  transactions_length: 'proveTransactionsDataLengthError',
  state_size: 'proveStateSizeError',
  state_root: 'proveStateRootError',
  transactions_root: 'proveTransactionsRootError',
  hard_transactions_range: 'proveHardTransactionsRangeError'
};


export function getErrorProofFunctionInput(proof: ErrorProof): ErrorProofFunctionInput {
  switch(proof._type) {
    case 'hard_create':
    case 'hard_deposit':
    case 'hard_withdrawal':
    case 'hard_add_signer':
    case 'soft_withdrawal':
    case 'soft_change_signer':
      return {
        name: 'proveExecutionError',
        data: [
          proof.header,
          encodeTransactionStateProof(proof),
          proof.transaction,
          proof.stateProof ? encodeAccountProof(proof.stateProof) : '0x',
          '0x'
        ]
      };
    case 'soft_create':
    case 'soft_transfer':
      return {
        name: 'proveExecutionError',
        data: [
          proof.header,
          encodeTransactionStateProof(proof),
          proof.transaction,
          proof.senderProof ? encodeAccountProof(proof.senderProof) : '0x',
          proof.receiverProof ? encodeAccountProof(proof.receiverProof) : '0x'
        ]
      };
    case 'hard_transactions_count':
    case 'state_size':
    case 'hard_transactions_range':
      return {
        name: blockErrorNamesMap[proof._type] as BlockErrorLibFunctionName,
        data: [
          proof.previousHeader,
          proof.header,
          proof.transactionsData
        ]
      }
    case 'transactions_length':
    case 'transactions_root':
    case 'state_root':
      return {
        name: blockErrorNamesMap[proof._type] as BlockErrorLibFunctionName,
        data: [
          proof.header,
          proof.transactionsData
        ]
      }
    case 'hard_transaction_source':
    case 'transaction_signature':
      return {
        name: proof._type == 'hard_transaction_source'
          ? 'proveHardTransactionSourceError'
          : 'proveSignatureError',
        data: [
          proof.header,
          proof.transaction,
          proof.transactionIndex,
          proof.siblings,
          proof.previousRootProof
            ? encodePreviousRootProof(proof.previousRootProof)
            : '0x',
          proof.stateProof
            ? encodeAccountProof(proof.stateProof)
            : '0x'
        ]
      }
  }
}