pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { BlockLib as Block } from "../lib/BlockLib.sol";


interface DharmaPegInterface {
  /* NOTE: include `bytes hardTransaction`? */
  event NewHardTransaction(uint256 hardTransactionIndex);

  function deposit(uint56 value) external;

  function deposit(address signerAddress, uint56 value) external;

  function forceAddSigner(
    uint32 accountIndex, address signingAddress
  ) external;

  function forceWithdrawal(uint32 accountIndex, uint56 value) external;

  /**
   * @dev executeWithdrawal
   * @notice Executes a withdrawal which exists in a confirmed block and
   * replaces the leaf with a null value.
   * @param header Block header which contains the transaction.
   * @param transaction Encoded hard or soft withdrawal transaction.
   * @param transactionIndex Location of the transaction in the transactions
   * tree for the block.
   * @param inclusionProof Array of sibling hashes for the transaction in the
   * merkle tree.
   */
  function executeWithdrawal(
    Block.BlockHeader calldata header,
    bytes calldata transaction,
    uint256 transactionIndex,
    bytes32[] calldata inclusionProof
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