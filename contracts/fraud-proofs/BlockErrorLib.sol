pragma solidity ^0.6.0;

import { BlockLib as Block } from "../lib/BlockLib.sol";
import { StateLib as State } from "../lib/StateLib.sol";
import { TransactionsLib as Tx } from "../lib/TransactionsLib.sol";
import { MerkleTreeLib as Merkle } from "../lib/merkle/MerkleTreeLib.sol";
import { FraudUtilsLib as utils } from "./FraudUtilsLib.sol";


library BlockErrorLib {
  using Block for bytes;
  using Block for Block.BlockHeader;
  using State for State.State;
  using Tx for bytes;
  using Tx for Tx.TransactionsMetadata;

  /**
   * @dev proveStateRootError
   * Proves that the state size in a block header does not match the expected state size based on
   * the creation transactions in the block.
   * @param state storage struct representing the peg state
   * @param badHeader block header with error
   * @param transactionsData transactions buffer from the block
   */
  function proveStateRootError(
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

    bytes32 root;
    // get the last 32 bytes of transactionsData, which will be the state root of the last transaction
    assembly { root := mload(add(transactionsData, mload(transactionsData))) }
    require(root != badHeader.stateRoot, "Block had correct state root.");
    state.revertBlock(badHeader);
  }
  
  /**
   * @dev proveTransactionsRootError
   * Proves that the transactions root in a block header does not
   * match the result of merkleizing the transactions data.
   * @param state storage struct representing the peg state
   * @param badHeader block header with error
   * @param transactionsData transactions buffer from the block
   */
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

  /**
   * @dev proveTransactionsDataLengthError
   * Proves that the length of the transactions data in a block is invalid.
   * "invalid" means that it either did not contain the transaction metadata
   * or that the length is not consistent with the length expected from the
   * metadata.
   * @param state storage struct representing the peg state
   * @param badHeader block header with error
   * @param transactionsData transactions buffer from the block
   */
  function proveTransactionsDataLengthError(
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

    if (transactionsData.length >= 16) {
      Tx.TransactionsMetadata memory meta = Tx.decodeTransactionsMetadata(transactionsData);
      uint256 expectedLength = Tx.expectedTransactionsLength(meta);
      require(transactionsData.length != expectedLength + 16, "Transactions data had correct length.");
    }
    state.revertBlock(badHeader);
  }

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

  /**
   * @dev proveHardTransactionsCountError
   * Proves that the `hardTransactionsCount` in the block header is not equal to
   * the total number of hard transactions in the metadata plus the previous block's
   * hard transactions count.
   * @param state storage struct representing the peg state
   * @param previousHeader header of the previous block
   * @param badHeader block header with error
   * @param transactionsData transactions buffer from the block
   */
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
   * @param state storage struct representing the peg state
   * @param previousHeader header of the previous block
   * @param badHeader block header with error
   * @param transactionsData transactions buffer from the block
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
        // Check if the hardTransactionIndex is less than the previous total
        if lt(txIndex, prevCount) {
          fraudProven := 1
          break
        }
        // Check if we have already found this hardTransactionIndex
        let ptr := add(bufPtr, sub(txIndex, prevCount))
        if eq(shr(248, mload(ptr)), 1) {
          fraudProven := 1
          break
        }
        // Mark the index as found
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
  /**
   * @dev proveHardTransactionsOrderError
   * Proves that a block has a missing or duplicate hard transaction index.
   * TODO - Replace this with something more specific, current approach
   * is a shoddy brute force search.
   * @param state storage struct representing the peg state
   * @param badHeader block header with error
   * @param transactionsData transactions buffer from the block
   */
  function proveHardTransactionsOrderError(
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

    Tx.TransactionsMetadata memory meta = transactionsData
      .decodeTransactionsMetadata();

    uint8 fraudProven = 0;
    assembly {
      let txOffset := add(transactionsData, 48) // skip length and metadata
      /* Check hard create indices */
      let len := mload(meta)
      let lastIndex := 0
      for {let i := 0} lt(i, len) {i := add(i, 1)} {
        let txIndex := shr(216, mload(txOffset))
        // Ensure that each hard create has an index higher than the last
        if iszero(gt(txIndex, lastIndex)) {
          fraudProven := 1
          break
        }
        lastIndex := txIndex
        txOffset := add(txOffset, 88)
      }
      if iszero(fraudProven) {
        /* Check hard deposit indices */
        len := mload(add(meta, 32))
        lastIndex := 0
        for {let i := 0} lt(i, len) {i := add(i, 1)} {
          let txIndex := shr(216, mload(txOffset))
          // Ensure that each hard deposit has an index higher than the last
          if iszero(gt(txIndex, lastIndex)) {
            fraudProven := 1
            break
          }
          lastIndex := txIndex
          txOffset := add(txOffset, 48)
        }
      }
      if iszero(fraudProven) {
        /* Check hard withdraw indices */
        len := mload(add(meta, 64))
        lastIndex := 0
        for {let i := 0} lt(i, len) {i := add(i, 1)} {
          let txIndex := shr(216, mload(txOffset))
          // Ensure that each hard withdraw has an index higher than the last
          if iszero(gt(txIndex, lastIndex)) {
            fraudProven := 1
            break
          }
          lastIndex := txIndex
          txOffset := add(txOffset, 68)
        }
      }
      if iszero(fraudProven) {
        /* Check hard add signer indices */
        len := mload(add(meta, 64))
        lastIndex := 0
        for {let i := 0} lt(i, len) {i := add(i, 1)} {
          let txIndex := shr(216, mload(txOffset))
          // Ensure that each hard add signer has an index higher than the last
          if iszero(gt(txIndex, lastIndex)) {
            fraudProven := 1
            break
          }
          lastIndex := txIndex
          txOffset := add(txOffset, 61)
        }
      }
    }
    require(fraudProven == 1, "Fraud not found in hard tx range.");
    return state.revertBlock(badHeader);
  }
}