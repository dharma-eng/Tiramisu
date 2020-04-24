pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { BlockLib as Block } from "./BlockLib.sol";

/**
 * @title StateLib
 * @dev Library for basic interaction with the Dharma Peg state.
 * This library defines the basic state structure for the peg contract, as well as some basic query and
 * utility functions for interacting with the state.
 */
library StateLib {
  using Block for Block.BlockHeader;

  struct State {
    uint32 confirmedBlocks;
    bytes32[] blockHashes;
    bytes[] hardTransactions;
  }

  /* State Query Functions */
  function blockIsPending(State storage state, uint32 blockNumber, bytes32 blockHash) internal view returns (bool) {
    bool validHash = state.blockHashes[blockNumber] == blockHash;
    if (!validHash) return false;
    return blockNumber >= state.confirmedBlocks;
  }

  function blockIsConfirmed(State storage state, uint32 blockNumber, bytes32 blockHash) internal view returns (bool) {
    bool validHash = state.blockHashes[blockNumber] == blockHash;
    if (!validHash) return false;
    return blockNumber < state.confirmedBlocks;
  }

  function blockIsPendingAndHasParent(
    State storage state,
    Block.BlockHeader memory header,
    Block.BlockHeader memory previousHeader
  ) internal view {
    require(header.blockNumber == previousHeader.blockNumber + 1, "Invalid block header.");
    bytes32 _hash = header.blockHash();
    bytes32 _prevHash = previousHeader.blockHash();
    require(
      blockIsPending(state, header.blockNumber, _hash) &&
      state.blockHashes[previousHeader.blockNumber] == _prevHash,
      "Blocks do not match."
    );
  }

  event BlockReverted(uint256 blockNumber, bytes32 blockHash);

  /**
   * @dev revertBlock
   * @notice Reverts a block and its descendants by removing them from the blocks array.
   * This function assumes that the header has already been verified as being pending.
   * This function does not execute any reward logic.
   * @param header Header of the block to revert
   */
  function revertBlock(State storage state, Block.BlockHeader memory header) internal {
    /* Works backwards through the block hash array, deleting descendands */
    bytes32[] storage blockHashes = state.blockHashes;
    uint256 len = blockHashes.length;
    delete blockHashes[header.blockNumber];
    for (uint256 i = header.blockNumber; i < len; i++) {
      emit BlockReverted(i, state.blockHashes[i]);
      delete state.blockHashes[i];
    }
    uint256 num = header.blockNumber;
    assembly {
      sstore(blockHashes_slot, num)
    }
  }
}