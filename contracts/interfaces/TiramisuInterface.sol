pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { BlockLib as Block } from "../lib/BlockLib.sol";


interface TiramisuInterface {
  /* NOTE: include `bytes hardTransaction`? */
  event NewHardTransaction(uint256 hardTransactionIndex);

  function deposit(uint56 value) external;

  function deposit(address signerAddress, uint56 value) external;

  function forceAddSigner(
    uint32 accountIndex, address signingAddress
  ) external;

  function forceWithdrawal(uint32 accountIndex, uint56 value) external;

  /**
   * @dev Executes the withdrawals in a confirmed block.
   * @param parent Header of the previous block, used to determine which withdrawals were executed.
   * @param header Header of the block with the withdrawals to execute
   * @param transactionsData Transactions buffer from the block.
   * merkle tree.
   */
  function executeWithdrawals(
    Block.BlockHeader calldata parent,
    Block.BlockHeader calldata header,
    bytes calldata transactionsData
  ) external;

  function confirmBlock(Block.BlockHeader calldata header) external;

  function submitBlock(Block.BlockInput calldata input) external;

  function getHardTransactionsFrom(
    uint256 start, uint256 max
  ) external view returns (bytes[] memory hardTransactions);

  function getBlockHash(uint256 height) external view returns (bytes32);

  function getBlockCount() external view returns (uint256);

  function getConfirmedBlockCount() external view returns (uint256);
}