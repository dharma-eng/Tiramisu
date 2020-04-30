pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { BlockLib as Block } from "./lib/BlockLib.sol";
import { StateLib as State } from "./lib/StateLib.sol";
import "./Configurable.sol";


contract StateManager is Configurable {
  using Block for Block.BlockHeader;
  using State for State.State;

  State.State internal _state;

  /* <-- Events --> */
  event BlockSubmitted(uint32 blockNumber, bytes32 blockHash);

  /* State Utility Functions */
  /**
   * @dev _putPendingBlock
   * @notice Puts a block in the array of pending blocks.
   * First ensures that the block has the expected number for the next block,
   * then converts the block to a commitment block header, which contains a
   * hash of the transactions data and the current block number.
   * @param input Block input data, including a header and transactions buffer.
   */
  function _putPendingBlock(Block.BlockInput memory input) internal {
    Block.BlockHeader memory header = Block.toCommitment(input);
    require(
      header.blockNumber == _state.blockHashes.length, "Invalid block number."
    );
    require(header.version == version, "Version mismatch.");
    bytes32 blockHash = Block.blockHash(header);
    _state.blockHashes.push(blockHash);
    emit BlockSubmitted(header.blockNumber, blockHash);
  }

  /**
   * @dev _confirmBlock
   * @notice Updates the lastConfirmedBlock value.
   * Checks:
   * - block is pending
   * - block has passed challenge period
   * - block number is one higher than last confirmed block number
   * @param header Block header to confirm.
   */
  function _confirmBlock(Block.BlockHeader memory header) internal {
    require(
      _state.blockIsPending(header.blockNumber, Block.blockHash(header)),
      "Only pending blocks can be confirmed."
    );

    require(
      header.submittedAt + challengePeriod <= block.number,
      "Challenge period still in progress."
    );

    require(
      header.blockNumber == _state.confirmedBlocks,
      "Blocks must be confirmed in order."
    );

    _state.confirmedBlocks += 1;
  }
}