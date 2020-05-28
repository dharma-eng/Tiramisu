# [🔗](/contracts/fraud-proofs/ExecutionErrorLib.sol#L11) ExecutionErrorLib
# Functions
## [🔗](/contracts/fraud-proofs/ExecutionErrorLib.sol#L22) `createsBeforeIndex(bytes txData, uint256 index)`

## [🔗](/contracts/fraud-proofs/ExecutionErrorLib.sol#L49) `proveCreateIndexError(State.State state, Block.BlockHeader previousHeader, Block.BlockHeader badHeader, uint256 transactionIndex, bytes transactionsData)`

Prove that the account index in a create transaction was not equal to the state size of the previous block plus the sum of create transactions executed previously in the same block.




### Parameters
* `state` storage struct representing the peg state
* `previousHeader` header of the last block
* `badHeader` header of the block containing the error
* `transactionIndex` index of the transaction with the bad create index
* `transactionsData` transactions buffer from the block

## [🔗](/contracts/fraud-proofs/ExecutionErrorLib.sol#L85) `validateExecutionErrorProof(bytes32 priorStateRoot, bytes stateProof, Tx.HardCreate transaction)`

Validate a hard create execution error proof.

An error can be proven if any of the following are verified:

- `stateProof` proves that an account with the contract address in the   transaction already existed.

- `stateProof` proves that the account with the index from the transaction   was not empty prior to the transaction.

- `stateProof` proves that the account with the index from the transaction   was empty, but the result of recalculating the state root with the account   that should have been created by the transaction is not equal to the   transaction's `intermediateStateRoot`.




### Parameters
* `priorStateRoot` State root prior to the transaction.
* `stateProof` Inclusion proof of the account in the tree
with root `priorStateRoot`.
* `transaction` Transaction to check for fraud.

## [🔗](/contracts/fraud-proofs/ExecutionErrorLib.sol#L135) `validateExecutionErrorProof(bytes32 priorStateRoot, bytes stateProof, Tx.HardDeposit transaction)`

Validate a HardDeposit execution error proof.




### Parameters
* `priorStateRoot` State root prior to the transaction.
* `stateProof` Inclusion proof of the account in
the tree with root `priorStateRoot`.
* `transaction` Transaction to check for fraud.

## [🔗](/contracts/fraud-proofs/ExecutionErrorLib.sol#L167) `validateExecutionErrorProof(bytes32 priorStateRoot, bytes stateProof, Tx.HardWithdrawal transaction)`

Validate a HardWithdrawal execution error proof.




### Parameters
* `priorStateRoot` State root prior to the transaction.
* `stateProof` Inclusion proof of the account in
the tree with root `priorStateRoot`.
* `transaction` Transaction to check for fraud.

## [🔗](/contracts/fraud-proofs/ExecutionErrorLib.sol#L202) `validateExecutionErrorProof(bytes32 priorStateRoot, bytes stateProof, Tx.HardAddSigner transaction)`

Validate a HardAddSigner execution error proof.




### Parameters
* `priorStateRoot` State root prior to the transaction.
* `stateProof` Inclusion proof of the account in
the tree with root `priorStateRoot`.
* `transaction` Transaction to check for fraud.

## [🔗](/contracts/fraud-proofs/ExecutionErrorLib.sol#L237) `validateExecutionErrorProof(bytes32 priorStateRoot, bytes stateProof, Tx.SoftWithdrawal transaction)`

Validate a SoftWithdrawal execution error proof.




### Parameters
* `priorStateRoot` State root prior to the transaction.
* `stateProof` Inclusion proof of the account in
the tree with root `priorStateRoot`.
* `transaction` Transaction to check for fraud.

## [🔗](/contracts/fraud-proofs/ExecutionErrorLib.sol#L268) `validateExecutionErrorProof(bytes32 priorStateRoot, bytes senderProof, bytes receiverProof, Tx.SoftCreate transaction)`

Validate a SoftCreate execution error proof.




### Parameters
* `priorStateRoot` State root prior to the transaction.
* `senderProof` Inclusion proof of the `from` account in
the tree with root `priorStateRoot`.
* `receiverProof` Inclusion proof of the `to` account for the intermediate
state root after applying the change to the `from` account.
* `transaction` Transaction to check for fraud.

## [🔗](/contracts/fraud-proofs/ExecutionErrorLib.sol#L325) `validateExecutionErrorProof(bytes32 priorStateRoot, bytes senderProof, bytes receiverProof, Tx.SoftTransfer transaction)`

Validate a SoftTransfer execution error proof.




### Parameters
* `priorStateRoot` State root prior to the transaction.
* `senderProof` Inclusion proof of the `from` account in
the tree with root `priorStateRoot`.
* `receiverProof` Inclusion proof of the `to` account for the intermediate
state root after applying the change to the `from` account.
* `transaction` Transaction to check for fraud.

## [🔗](/contracts/fraud-proofs/ExecutionErrorLib.sol#L374) `validateExecutionErrorProof(bytes32 priorStateRoot, bytes stateProof, Tx.SoftChangeSigner transaction)`

Validate a SoftChangeSigner execution error proof.




### Parameters
* `priorStateRoot` State root prior to the transaction.
* `stateProof` Inclusion proof of the account in
the tree with root `priorStateRoot`.
* `transaction` Transaction to check for fraud.

## [🔗](/contracts/fraud-proofs/ExecutionErrorLib.sol#L412) `proveExecutionError(State.State state, Block.BlockHeader header, bytes transactionProof, bytes transaction, bytes stateProof1, bytes stateProof2)`

