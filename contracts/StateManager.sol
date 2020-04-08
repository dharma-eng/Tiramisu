pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { BlockLib as Block } from "./lib/BlockLib.sol";

contract StateManager {
  uint32 lastConfirmedBlock;
  bytes32[] blockHashes;

  /* State Query Functions */
  function blockIsPending(uint32 blockNumber, bytes32 blockHash) internal view returns (bool) {
    bool validHash = blockHashes[blockNumber] == blockHash;
    if (!validHash) return false;
    return blockNumber > lastConfirmedBlock;
  }

  function blockIsConfirmed(uint32 blockNumber, bytes32 blockHash) internal view returns (bool) {
    bool validHash = blockHashes[blockNumber] == blockHash;
    if (!validHash) return false;
    return blockNumber <= lastConfirmedBlock;
  }

  /* State Utility Functions */
  /**
   * @dev putPendingBlock
   * @notice Puts a block in the array of pending blocks.
   * First ensures that the block has the expected number for the next block,
   * then converts the block to a commitment block header, which contains a
   * hash of the transactions data and the current block number.
   * @param input Block input data, including a header and transactions buffer.
   */
  function putPendingBlock(Block.BlockInput memory input) internal {
    Block.BlockHeader memory header = Block.toCommitment(input);
    require(header.blockNumber == blockHashes.length, "Invalid block number.");
    bytes32 blockHash = Block.blockHash(header);
    blockHashes.push(blockHash);
    emit Block.BlockSubmitted(header.blockNumber, blockHash);
  }

  /**
   * @dev confirmBlock
   * @notice Updates the lastConfirmedBlock value.
   * Checks:
   * - block is pending
   * - block has passed challenge period
   * - block number is one higher than last confirmed block number
   * @param header Block header to confirm.
   */
  function confirmBlock(Block.BlockHeader memory header) internal {
    require(blockIsPending(header.blockNumber, Block.blockHash(header)), "Only pending blocks can be confirmed.");
    require(header.submittedAt + challengePeriod <= block.number, "Challenge period still in progress.");
    require(header.blockNumber == lastConfirmedBlock + 1, "Blocks must be confirmed in order.");
    lastConfirmedBlock += 1;
  }

  /**
   * @dev revertBlock
   * @notice Reverts a block and its descendants by removing them from the blocks array.
   * The block must currently be pending in order to be reverted.
   * This function does not execute any reward logic.
   * @param blockNumber
   * @param blockHash
   * @return Number of blocks reverted.
   */
  function revertBlock(uint32 blockNumber, bytes32 blockHash) internal returns (uint256 reverted) {
    require(blockIsPending(blockNumber, blockHash), "Block must be pending to be reverted.");
    /* Works backwards through the block hash array, deleting descendands */
    for (uint256 i = blockHashes.length; i >= blockNumber; i--) {
      reverted++;
      delete blockHashes[i];
    }
  }
}