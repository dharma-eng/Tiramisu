## `BlockErrorLib`

### `proveStateRootError(struct StateLib.State state, struct BlockLib.BlockHeader badHeader, bytes transactionsData)` (internal)

proveStateRootError
Proves that the state size in a block header does not match the expected state size based on
the creation transactions in the block.

### `proveStateSizeError(struct StateLib.State state, struct BlockLib.BlockHeader previousHeader, struct BlockLib.BlockHeader badHeader, bytes transactionsData)` (internal)

proveStateSizeError
Proves that the state size in a block header does not match the expected state size based on
the creation transactions in the block.

### `proveTransactionsRootError(struct StateLib.State state, struct BlockLib.BlockHeader badHeader, bytes transactionsData)` (internal)

proveTransactionsRootError
Proves that the transactions root in a block header does not
match the result of merkleizing the transactions data.

### `proveTransactionsDataLengthError(struct StateLib.State state, struct BlockLib.BlockHeader badHeader, bytes transactionsData)` (internal)

proveTransactionsDataLengthError
Proves that the length of the transactions data in a block is invalid.
"invalid" means that it either did not contain the transaction metadata
or that the length is not consistent with the length expected from the
metadata.

### `proveHardTransactionsCountError(struct StateLib.State state, struct BlockLib.BlockHeader previousHeader, struct BlockLib.BlockHeader badHeader, bytes transactionsData)` (internal)

proveHardTransactionsCountError
Proves that the `hardTransactionsCount` in the block header is not equal to
the total number of hard transactions in the metadata plus the previous block's
hard transactions count.

### `proveHardTransactionsRangeError(struct StateLib.State state, struct BlockLib.BlockHeader previousHeader, struct BlockLib.BlockHeader badHeader, bytes transactionsData)` (internal)

proveHardTransactionsRangeError
Proves that a block has a missing or duplicate hard transaction index.

### `proveHardTransactionsOrderError(struct StateLib.State state, struct BlockLib.BlockHeader badHeader, bytes transactionsData)` (internal)

proveHardTransactionsOrderError
Proves that a block has a missing or duplicate hard transaction index.
TODO - Replace this with something more specific, current approach
is a shoddy brute force search.

### `checkTypeForTransactionsRangeError(uint256 offset, uint256 buffer, uint256 len, uint256 size, uint256 prevTotal) → uint256 newOffset, bool fraudulent` (internal)

### `checkTypeForTransactionsOrderError(uint256 offset, uint256 len, uint256 size) → uint256 newOffset, bool fraudulent` (internal)
