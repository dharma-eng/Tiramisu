/* State.State storage state,
    Block.BlockHeader memory badHeader,
    bytes memory transaction,
    uint256 transactionIndex,
    bytes32[] memory siblings,
    bytes memory previousStateProof,
    bytes memory stateProof */
import { TransactionStateProof } from './inclusion-proofs';
import { ErrorProofData, ErrorType, With_Transactions, With_Parent } from "./base";
import { AccountProof } from '../../state';

// export type ProofData_ExecutionError = ErrorProofData & TransactionIn
export type ProofData_Basic = TransactionStateProof & {
  stateProof?: AccountProof;
};

export type ProofData_CreateIndex = ErrorProofData & With_Parent & With_Transactions & { transactionIndex: number };
export type ProofData_CallerReceiver = TransactionStateProof & {
  senderProof: AccountProof;
  receiverProof?: AccountProof;
}


export type CreateIndexError = ErrorType<"create_index_error", ProofData_CreateIndex>;

export type HardCreateExecutionError = ErrorType<"hard_create", ProofData_Basic>;
export type HardDepositExecutionError = ErrorType<"hard_deposit", ProofData_Basic>;
export type HardWithdrawalExecutionError = ErrorType<"hard_withdrawal", ProofData_Basic>;
export type HardAddSignerExecutionError = ErrorType<"hard_add_signer", ProofData_Basic>;

export type SoftWithdrawalExecutionError = ErrorType<"soft_withdrawal", ProofData_Basic>;
export type SoftCreateExecutionError = ErrorType<"soft_create", ProofData_CallerReceiver>;
export type SoftTransferExecutionError = ErrorType<"soft_transfer", ProofData_CallerReceiver>;
export type SoftChangeSignerExecutionError = ErrorType<"soft_change_signer", ProofData_Basic>;

export type ExecutionError = HardCreateExecutionError |
  HardDepositExecutionError |
  HardWithdrawalExecutionError |
  HardAddSignerExecutionError |
  SoftWithdrawalExecutionError |
  SoftCreateExecutionError |
  SoftTransferExecutionError |
  SoftChangeSignerExecutionError |
  CreateIndexError;