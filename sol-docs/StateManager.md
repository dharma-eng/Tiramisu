# [🔗](/contracts/StateManager.sol#L10) StateManager

# Functions

## [🔗](/contracts/StateManager.sol#L15) `_putPendingBlock(Block.BlockInput input)`

\_putPendingBlock

Puts a block in the array of pending blocks.

First ensures that the block has the expected number for the next block, then converts the block to a commitment block header, which contains a hash of the transactions data and the current block number.

### Parameters

- `input` Block input data, including a header and transactions buffer.

## [🔗](/contracts/StateManager.sol#L34) `_confirmBlock(Block.BlockHeader header)`

\_confirmBlock

Updates the lastConfirmedBlock value.

Checks:

- block is pending
- block has passed challenge period
- block number is one higher than last confirmed block number

### Parameters

- `header` Block header to confirm.
