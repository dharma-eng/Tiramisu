# [🔗](/contracts/lib/StateLib.sol#L7) StateLib

Library for basic interaction with the Dharma Peg state.

This library defines the basic state structure for the peg contract, as well as some basic query and utility functions for interacting with the state.

# Data Structures

## [🔗](/contracts/lib/StateLib.sol#L16) State

### Properties

- `uint32 confirmedBlocks`
- `undefined blockHashes`
- `undefined hardTransactions`
- `undefined withdrawalsProcessed`

# Functions

## [🔗](/contracts/lib/StateLib.sol#L24) `blockIsPending(State state, uint32 blockNumber, bytes32 blockHash)`

## [🔗](/contracts/lib/StateLib.sol#L32) `blockIsConfirmed(State state, uint32 blockNumber, bytes32 blockHash)`

## [🔗](/contracts/lib/StateLib.sol#L40) `blockIsPendingAndHasParent(State state, Block.BlockHeader header, Block.BlockHeader previousHeader)`

## [🔗](/contracts/lib/StateLib.sol#L60) `revertBlock(State state, Block.BlockHeader header)`

revertBlock

Reverts a block and its descendants by removing them from the blocks array.

This function assumes that the header has already been verified as being pending.

This function does not execute any reward logic.

### Parameters

- `state` undefined
- `header` Header of the block to revert
