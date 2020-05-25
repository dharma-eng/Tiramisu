# [🔗](/contracts/fraud-proofs/FraudUtilsLib.sol#L10) FraudUtilsLib

# Data Structures

## [🔗](/contracts/fraud-proofs/FraudUtilsLib.sol#L14) TransactionProof

### Properties

- `bytes transactionData`
- `undefined siblings`

## [🔗](/contracts/fraud-proofs/FraudUtilsLib.sol#L103) TransactionStateProof

### Properties

- `uint256 transactionIndex`
- `undefined siblings`
- `bytes previousRootProof`

# Functions

## [🔗](/contracts/fraud-proofs/FraudUtilsLib.sol#L19) `transactionHadPreviousState(State.State state, bytes previousRootProof, Block.BlockHeader blockHeader, uint256 transactionIndex)`

Verifies the state root prior to a transaction.

### Parameters

- `state` storage struct representing the peg state
- `previousRootProof` ABI encoded form of either a block header or a transaction inclusion proof
- `blockHeader` Header of the block with the original transaction
- `transactionIndex` Index of the original transaction

### Returns

- `bytes32`

## [🔗](/contracts/fraud-proofs/FraudUtilsLib.sol#L74) `verifyPreviousAccountState(State.State state, Block.BlockHeader badHeader, uint256 transactionIndex, bytes previousStateProof, bytes stateProof)`

Verifies the state of an account in the state root prior to a transaction.

### Parameters

- `state` storage struct representing the peg state
- `badHeader` Header of the block with the original transaction
- `transactionIndex` Index of the original transaction
- `previousStateProof` ABI encoded form of either a block header or a transaction inclusion proof
- `stateProof` Merkle proof of the account in the previous state root.

### Returns

- `bool empty`
- `uint256 accountIndex`
- `undefined siblings`
- `Account.Account account`

## [🔗](/contracts/fraud-proofs/FraudUtilsLib.sol#L109) `validateTransactionStateProof(State.State state, Block.BlockHeader header, bytes proofBytes, bytes transactionBytes)`

validateTransactionStateProof Decodes and validates a TransactionStateProof, which contains an inclusion proof for a transaction and the state root prior to its execution.

### Parameters

- `state` storage struct representing the peg state
- `header` header of the block with the original transaction
- `proofBytes` encoded TransactionStateProof
- `transactionBytes` encoded transaction to verify inclusion proof of

### Returns

- `bytes32 root` root state root prior to the transaction
