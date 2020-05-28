# [🔗](/contracts/fraud-proofs/BlockErrorLib.sol#L9) BlockErrorLib
# Functions
## [🔗](/contracts/fraud-proofs/BlockErrorLib.sol#L16) `proveStateRootError(State.State state, Block.BlockHeader badHeader, bytes transactionsData)`

proveStateRootError Proves that the state root in a block header does not match the expected state size based on the creation transactions in the block.




### Parameters
* `state` storage struct representing the peg state
* `badHeader` block header with error
* `transactionsData` transactions buffer from the block

## [🔗](/contracts/fraud-proofs/BlockErrorLib.sol#L46) `proveStateSizeError(State.State state, Block.BlockHeader previousHeader, Block.BlockHeader badHeader, bytes transactionsData)`

proveStateSizeError Proves that the state size in a block header does not match the expected state size based on the creation transactions in the block.




### Parameters
* `state` storage struct representing the peg state
* `previousHeader` block header prior to the fraudulent header
* `badHeader` block header with error
* `transactionsData` transactions buffer from the block

## [🔗](/contracts/fraud-proofs/BlockErrorLib.sol#L78) `proveTransactionsRootError(State.State state, Block.BlockHeader badHeader, bytes transactionsData)`

proveTransactionsRootError Proves that the transactions root in a block header does not match the result of merkleizing the transactions data.




### Parameters
* `state` storage struct representing the peg state
* `badHeader` block header with error
* `transactionsData` transactions buffer from the block

## [🔗](/contracts/fraud-proofs/BlockErrorLib.sol#L106) `proveTransactionsDataLengthError(State.State state, Block.BlockHeader badHeader, bytes transactionsData)`

proveTransactionsDataLengthError Proves that the length of the transactions data in a block is invalid.

"invalid" means that it either did not contain the transaction metadata or that the length is not consistent with the length expected from the metadata.




### Parameters
* `state` storage struct representing the peg state
* `badHeader` block header with error
* `transactionsData` transactions buffer from the block

## [🔗](/contracts/fraud-proofs/BlockErrorLib.sol#L139) `proveHardTransactionsCountError(State.State state, Block.BlockHeader previousHeader, Block.BlockHeader badHeader, bytes transactionsData)`

proveHardTransactionsCountError Proves that the `hardTransactionsCount` in the block header is not equal to the total number of hard transactions in the metadata plus the previous block's hard transactions count.




### Parameters
* `state` storage struct representing the peg state
* `previousHeader` header of the previous block
* `badHeader` block header with error
* `transactionsData` transactions buffer from the block

## [🔗](/contracts/fraud-proofs/BlockErrorLib.sol#L180) `proveHardTransactionsRangeError(State.State state, Block.BlockHeader previousHeader, Block.BlockHeader badHeader, bytes transactionsData)`

proveHardTransactionsRangeError Proves that a block has a missing or duplicate hard transaction index.




### Parameters
* `state` storage struct representing the peg state
* `previousHeader` header of the previous block
* `badHeader` block header with error
* `transactionsData` transactions buffer from the block

## [🔗](/contracts/fraud-proofs/BlockErrorLib.sol#L252) `proveHardTransactionsOrderError(State.State state, Block.BlockHeader badHeader, bytes transactionsData)`

proveHardTransactionsOrderError Proves that a block has a hard transaction which is out of order.

TODO - Replace this with something more specific, current approach is a shoddy brute force search.




### Parameters
* `state` storage struct representing the peg state
* `badHeader` block header with error
* `transactionsData` transactions buffer from the block

## [🔗](/contracts/fraud-proofs/BlockErrorLib.sol#L317) `checkTypeForTransactionsRangeError(uint256 offset, uint256 buffer, uint256 len, uint256 size, uint256 prevTotal)`

## [🔗](/contracts/fraud-proofs/BlockErrorLib.sol#L350) `checkTypeForTransactionsOrderError(uint256 offset, uint256 len, uint256 size)`

