pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { BlockLib as Block } from "./lib/BlockLib.sol";
import { StateLib as State } from "./lib/StateLib.sol";
import "./Configurable.sol";
import "./interfaces/StateManagerInterface.sol";
import "./lib/Stateful.sol";


contract StateManager is Stateful, StateManagerInterface, Configurable {
  using Block for Block.BlockHeader;
  using State for State.State;

  constructor() public {
    Block.BlockHeader memory genesis = Block.BlockHeader({
      blockNumber: 0,
      hardTransactionsCount: 0,
      stateRoot: 0x78ccaaab73373552f207a63599de54d7d8d0c1805f86ce7da15818d09f4cff62,
      stateSize: 0,
      submittedAt: 0,
      transactionsHash: 0x0000000000000000000000000000000000000000000000000000000000000000,
      transactionsRoot: 0x0000000000000000000000000000000000000000000000000000000000000000,
      version: 0
    });
    _state.blockHashes.push(genesis.blockHash());
    _state.confirmedBlocks = 1;
  }

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