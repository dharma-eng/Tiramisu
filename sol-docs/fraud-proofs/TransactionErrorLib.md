## `TransactionErrorLib`

### `proveHardCreateSourceError(bytes inputData, bytes outputData) → bool` (internal)

### `proveHardDepositSourceError(struct StateLib.State state, struct BlockLib.BlockHeader badHeader, bytes inputData, bytes outputData, uint256 transactionIndex, bytes previousStateProof, bytes stateProof) → bool` (internal)

### `proveHardWithdrawSourceError(bytes inputData, bytes outputData) → bool` (internal)

### `proveHardAddSignerSourceError(struct StateLib.State state, struct BlockLib.BlockHeader badHeader, bytes inputData, bytes outputData, uint256 transactionIndex, bytes previousStateProof, bytes stateProof) → bool` (internal)

### `proveHardTransactionSourceError(struct StateLib.State state, struct BlockLib.BlockHeader badHeader, bytes transaction, uint256 transactionIndex, bytes32[] siblings, bytes previousStateProof, bytes stateProof)` (internal)

### `proveSignatureError(struct StateLib.State state, struct BlockLib.BlockHeader badHeader, bytes transaction, uint256 transactionIndex, bytes32[] siblings, bytes previousStateProof, bytes stateProof)` (internal)
