pragma solidity ^0.6.0;

import { BlockLib as Block } from "../lib/BlockLib.sol";
import { StateLib as State } from "../lib/StateLib.sol";
import { TransactionsLib as Tx } from "../lib/TransactionsLib.sol";
import { MerkleTreeLib as Merkle } from "../lib/merkle/MerkleTreeLib.sol";
import { FraudUtilsLib as utils } from "./FraudUtilsLib.sol";


library HeaderFraudProofs {
  using Block for bytes;
  using Block for Block.BlockHeader;
  using State for State.State;
  using Tx for bytes;
  using Tx for Tx.TransactionsMetadata;

  /**
   * @dev proveStateSizeError
   * Proves that the state size in a block header does not match the expected state size based on
   * the creation transactions in the block.
   * @param state storage struct representing the peg state
   * @param previousHeader block header prior to the fraudulent header
   * @param badHeader block header with error
   * @param transactionsData transactions buffer from the block
   */
  function proveStateSizeError(
    State.State storage state,
    Block.BlockHeader memory previousHeader,
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) internal {
    state.blockIsPendingAndHasParent(badHeader, previousHeader);

    require(
      badHeader.hasTransactionsData(transactionsData),
      "Header does not match transactions data."
    );

    Tx.TransactionsMetadata memory meta = transactionsData
      .decodeTransactionsMetadata();

    uint256 failures = transactionsData.countCreateTransactionsWithEmptyRoot(
      meta
    );

    uint256 expectedIncrease = (
      (meta.hardCreateCount + meta.softCreateCount) - failures
    );

    if (badHeader.stateSize != (previousHeader.stateSize + expectedIncrease)) {
      state.revertBlock(badHeader);
    }
  }

  function putLeaves(
    bytes[] memory leaves,
    bool identitySuccess,
    uint256 leafIndex,
    uint256 currentPointer,
    uint8 typePrefix,
    uint256 typeCount,
    uint256 typeSize
  ) internal view returns (
    bool _identitySuccess, uint256 _leafIndex, uint256 _currentPointer
  ) {
    // Iterate over a set of memory pointers dictated by typeSize and typeCount.
    uint256 finalPointer = currentPointer + (typeSize * typeCount);

    for (uint256 i = currentPointer; i < finalPointer; i += typeSize) {
      // Allocate a memory region for the transaction and set the prefix.
      bytes memory transaction = new bytes(typeSize + 1);
      transaction[0] = byte(typePrefix);

      assembly {
        // Get target location in memory, skipping the length and prefix.
        let targetPointer := add(transaction, 33)

        // Perform a "memcpy" using the identity precompile contract.
        identitySuccess := staticcall(
          gas(), 4, i, typeSize, targetPointer, typeSize
        )
      }

      // Update the relevant leaf and increment the index.
      leaves[leafIndex++] = transaction;
    }

    return (identitySuccess, leafIndex, currentPointer);
  }

  function proveTransactionsRootError(
    State.State storage state,
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) internal {
    require(
      state.blockIsPending(badHeader.blockNumber, badHeader.blockHash()),
      "Block not pending."
    );

    require(
      badHeader.hasTransactionsData(transactionsData),
      "Header does not match transactions data."
    );
    bytes32 calculatedRoot = Tx.deriveTransactionsRoot(transactionsData);
    if (calculatedRoot != badHeader.transactionsRoot) {
      state.revertBlock(badHeader);
    }
  }

  function proveHardTransactionsCountError(
    State.State storage state,
    Block.BlockHeader memory previousHeader,
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) internal {
    state.blockIsPendingAndHasParent(badHeader, previousHeader);

    require(
      badHeader.hasTransactionsData(transactionsData),
      "Header does not match transactions data."
    );

    Tx.TransactionsMetadata memory meta = transactionsData
      .decodeTransactionsMetadata();

    uint256 hardTxSum = (
      meta.hardCreateCount + meta.hardDepositCount +
      meta.hardWithdrawCount + meta.hardAddSignerCount
    );

    require(
      badHeader.hardTransactionsCount != (
        previousHeader.hardTransactionsCount + hardTxSum
      ), "Hard transactions count not invalid."
    );

    return state.revertBlock(badHeader);
  }

  /* solhint-disable function-max-lines */ // TODO: simplify this function
  /**
   * @dev proveHardTransactionsRangeError
   * Proves that a block has a missing or duplicate hard transaction index.
   */
  function proveHardTransactionsRangeError(
    State.State storage state,
    Block.BlockHeader memory previousHeader,
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) internal {
    state.blockIsPendingAndHasParent(badHeader, previousHeader);

    require(
      badHeader.hasTransactionsData(transactionsData),
      "Header does not match transactions data."
    );

    Tx.TransactionsMetadata memory meta = transactionsData
      .decodeTransactionsMetadata();

    uint256 hardTxSum = (
      meta.hardCreateCount + meta.hardDepositCount +
      meta.hardWithdrawCount + meta.hardAddSignerCount
    );

    uint256 prevCount = previousHeader.hardTransactionsCount;
    bytes memory indexBuffer = new bytes(hardTxSum);
    uint8 fraudProven = 0;
    assembly {
      let bufPtr := add(indexBuffer, 32)
      let txOffset := add(transactionsData, 48) // skip length and metadata
      /* Check hard create indices */
      let len := mload(meta)
      for {let i := 0} lt(i, len) {i := add(i, 1)} {
        let txIndex := shr(216, mload(txOffset))
        if lt(txIndex, prevCount) {
          fraudProven := 1
          break
        }
        let ptr := add(bufPtr, sub(txIndex, prevCount))
        if eq(shr(248, mload(ptr)), 1) {
          fraudProven := 1
          break
        }
        mstore8(ptr, 1)
        txOffset := add(txOffset, 88)
      }
      if iszero(fraudProven) {
        /* Check hard deposit indices */
        len := mload(add(meta, 32))
        for {let i := 0} lt(i, len) {i := add(i, 1)} {
          let txIndex := shr(216, mload(txOffset))
          if lt(txIndex, prevCount) {
            fraudProven := 1
            break
          }
          let ptr := add(bufPtr, sub(txIndex, prevCount))
          if eq(shr(248, mload(ptr)), 1) {
            fraudProven := 1
            break
          }
          mstore8(ptr, 1)
          txOffset := add(txOffset, 48)
        }
      }
      if iszero(fraudProven) {
        /* Check hard withdraw indices */
        len := mload(add(meta, 64))
        for {let i := 0} lt(i, len) {i := add(i, 1)} {
          let txIndex := shr(216, mload(txOffset))
          if lt(txIndex, prevCount) {
            fraudProven := 1
            break
          }
          let ptr := add(bufPtr, sub(txIndex, prevCount))
          if eq(shr(248, mload(ptr)), 1) {
            fraudProven := 1
            break
          }
          mstore8(ptr, 1)
          txOffset := add(txOffset, 68)
        }
      }
      if iszero(fraudProven) {
        /* Check hard add signer indices */
        len := mload(add(meta, 64))
        for {let i := 0} lt(i, len) {i := add(i, 1)} {
          let txIndex := shr(216, mload(txOffset))
          if lt(txIndex, prevCount) {
            fraudProven := 1
            break
          }
          let ptr := add(bufPtr, sub(txIndex, prevCount))
          if eq(shr(248, mload(ptr)), 1) {
            fraudProven := 1
            break
          }
          mstore8(ptr, 1)
          txOffset := add(txOffset, 61)
        }
      }
    }
    require(fraudProven == 1, "Fraud not found in hard tx range.");
    return state.revertBlock(badHeader);
  }
  /* solhint-enable function-max-lines */
}