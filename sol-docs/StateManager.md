## `StateManager`

### `_putPendingBlock(struct BlockLib.BlockInput input)` (internal)

Puts a block in the array of pending blocks.
First ensures that the block has the expected number for the next block,
then converts the block to a commitment block header, which contains a
hash of the transactions data and the current block number.

\_putPendingBlock

### `_confirmBlock(struct BlockLib.BlockHeader header)` (internal)

Updates the lastConfirmedBlock value.
Checks:

- block is pending
- block has passed challenge period
- block number is one higher than last confirmed block number

\_confirmBlock
