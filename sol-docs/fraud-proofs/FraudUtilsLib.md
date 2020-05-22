## `FraudUtilsLib`

### `transactionHadPreviousState(struct StateLib.State state, bytes previousSource, struct BlockLib.BlockHeader blockHeader, uint256 transactionIndex) → bytes32` (internal)

### `verifyPreviousAccountState(struct StateLib.State state, struct BlockLib.BlockHeader badHeader, uint256 transactionIndex, bytes previousStateProof, bytes stateProof) → bool empty, uint256 accountIndex, bytes32[] siblings, struct AccountLib.Account account` (internal)

### `validateTransactionStateProof(struct StateLib.State state, struct BlockLib.BlockHeader header, bytes proofBytes, bytes transactionBytes) → bytes32 root` (internal)

validateTransactionStateProof
Decodes and validates a TransactionStateProof, which contains
an inclusion proof for a transaction and the state root prior to
its execution.
