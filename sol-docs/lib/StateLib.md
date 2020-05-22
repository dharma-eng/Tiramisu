## `StateLib`

Library for basic interaction with the Dharma Peg state.
This library defines the basic state structure for the peg contract, as well as some basic query and
utility functions for interacting with the state.

### `blockIsPending(struct StateLib.State state, uint32 blockNumber, bytes32 blockHash) → bool` (internal)

### `blockIsConfirmed(struct StateLib.State state, uint32 blockNumber, bytes32 blockHash) → bool` (internal)

### `blockIsPendingAndHasParent(struct StateLib.State state, struct BlockLib.BlockHeader header, struct BlockLib.BlockHeader previousHeader)` (internal)

### `revertBlock(struct StateLib.State state, struct BlockLib.BlockHeader header)` (internal)

Reverts a block and its descendants by removing them from the blocks array.
This function assumes that the header has already been verified as being pending.
This function does not execute any reward logic.

revertBlock

### `BlockReverted(uint256 blockNumber, bytes32 blockHash)`
