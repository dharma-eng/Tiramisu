## `ExecutionErrorLib`

### `executedCreatesBeforeIndex(bytes txData, uint256 index) → uint256 pointer, uint256 creates, bool hard` (internal)

Determine how many successful create transactions were executed prior to `index`.

### `proveCreateIndexError(struct StateLib.State state, struct BlockLib.BlockHeader previousHeader, struct BlockLib.BlockHeader badHeader, uint256 transactionIndex, bytes transactionsData)` (internal)

proveCreateIndexError
Prove that the account index in a create transaction was not equal to the
state size of the previous block plus the sum of create
transactions executed previously in the same block.

### `validateExecutionErrorProof(bytes32 priorStateRoot, bytes stateProof, struct TransactionsLib.HardCreate transaction)` (internal)

Validate a hard create execution error proof.

### `validateExecutionErrorProof(bytes32 priorStateRoot, bytes stateProof, struct TransactionsLib.HardDeposit transaction)` (internal)

Validate a HardDeposit execution error proof.

### `validateExecutionErrorProof(bytes32 priorStateRoot, bytes stateProof, struct TransactionsLib.HardWithdrawal transaction)` (internal)

Validate a HardWithdrawal execution error proof.

### `validateExecutionErrorProof(bytes32 priorStateRoot, bytes stateProof, struct TransactionsLib.HardAddSigner transaction)` (internal)

Validate a HardAddSigner execution error proof.

### `validateExecutionErrorProof(bytes32 priorStateRoot, bytes stateProof, struct TransactionsLib.SoftWithdrawal transaction)` (internal)

Validate a SoftWithdrawal execution error proof.

### `validateExecutionErrorProof(bytes32 priorStateRoot, bytes senderProof, bytes receiverProof, struct TransactionsLib.SoftCreate transaction)` (internal)

Validate a SoftCreate execution error proof.

### `validateExecutionErrorProof(bytes32 priorStateRoot, bytes senderProof, bytes receiverProof, struct TransactionsLib.SoftTransfer transaction)` (internal)

Validate a SoftTransfer execution error proof.

### `validateExecutionErrorProof(bytes32 priorStateRoot, bytes stateProof, struct TransactionsLib.SoftChangeSigner transaction)` (internal)

Validate a SoftChangeSigner execution error proof.

### `proveExecutionError(struct StateLib.State state, struct BlockLib.BlockHeader header, bytes transactionProof, bytes transaction, bytes stateProof1, bytes stateProof2)` (internal)
