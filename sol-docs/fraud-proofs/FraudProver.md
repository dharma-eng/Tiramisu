## `FraudProver`

### `proveStateRootError(struct BlockLib.BlockHeader badHeader, bytes transactionsData)` (public)

### `proveStateSizeError(struct BlockLib.BlockHeader previousHeader, struct BlockLib.BlockHeader badHeader, bytes transactionsData)` (public)

### `proveTransactionsRootError(struct BlockLib.BlockHeader badHeader, bytes transactionsData)` (public)

### `proveHardTransactionsCountError(struct BlockLib.BlockHeader previousHeader, struct BlockLib.BlockHeader badHeader, bytes transactionsData)` (public)

### `proveHardTransactionsRangeError(struct BlockLib.BlockHeader previousHeader, struct BlockLib.BlockHeader badHeader, bytes transactionsData)` (public)

### `proveHardTransactionsOrderError(struct BlockLib.BlockHeader badHeader, bytes transactionsData)` (public)

### `proveTransactionsDataLengthError(struct BlockLib.BlockHeader badHeader, bytes transactionsData)` (public)

### `proveHardTransactionSourceError(struct BlockLib.BlockHeader badHeader, bytes transaction, uint256 transactionIndex, bytes32[] siblings, bytes previousStateProof, bytes stateProof)` (public)

### `proveSignatureError(struct BlockLib.BlockHeader badHeader, bytes transaction, uint256 transactionIndex, bytes32[] siblings, bytes previousStateProof, bytes stateProof)` (public)

### `proveCreateIndexError(struct BlockLib.BlockHeader previousHeader, struct BlockLib.BlockHeader badHeader, uint256 transactionIndex, bytes transactionsData)` (public)

### `proveExecutionError(struct BlockLib.BlockHeader header, bytes transactionProof, bytes transaction, bytes stateProof1, bytes stateProof2)` (public)
