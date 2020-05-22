pragma solidity ^0.6.0;

import { BlockLib as Block } from "../lib/BlockLib.sol";
import { StateLib as State } from "../lib/StateLib.sol";
import { TransactionsLib as Tx } from "../lib/TransactionsLib.sol";
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

  /* solhint-disable function-max-lines */
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

    uint256 bufPtr;
    uint256 txOffset;
    uint256 len;
    bool fraudProven = false;

    assembly {
      bufPtr := add(indexBuffer, 32)
      txOffset := add(transactionsData, 48) // skip length and metadata
      len := mload(meta)
    }

    (txOffset, fraudProven) = checkTypeForTransactionsRangeError(
      txOffset, bufPtr, len, 88, prevCount
    );

    if (!fraudProven) {
      assembly { len := mload(add(meta, 32)) }
      (txOffset, fraudProven) = checkTypeForTransactionsRangeError(
        txOffset, bufPtr, len, 48, prevCount
      );
    }

    if (!fraudProven) {
      assembly { len := mload(add(meta, 64)) }
      (txOffset, fraudProven) = checkTypeForTransactionsRangeError(
        txOffset, bufPtr, len, 68, prevCount
      );
    }

    if (!fraudProven) {
      assembly { len := mload(add(meta, 96)) }
      (, fraudProven) = checkTypeForTransactionsRangeError(
        txOffset, bufPtr, len, 61, prevCount
      );
    }

    require(fraudProven, "Fraud not found in hard tx range.");
    return state.revertBlock(badHeader);
  }

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

    uint256 len;
    uint256 txOffset;
    bool fraudProven = false;
    assembly {
      txOffset := add(transactionsData, 48) // skip length and metadata
      len := mload(meta)
    }

    (txOffset, fraudProven) = checkTypeForTransactionsOrderError(
      txOffset, len, 88
    );

    if (!fraudProven) {
      assembly { len := mload(add(meta, 32))}
      (txOffset, fraudProven) = checkTypeForTransactionsOrderError(
        txOffset, len, 48
      );
    }

    if (!fraudProven) {
      assembly { len := mload(add(meta, 64))}
      (txOffset, fraudProven) = checkTypeForTransactionsOrderError(
        txOffset, len, 68
      );
    }

    if (!fraudProven) {
      assembly { len := mload(add(meta, 96))}
      (txOffset, fraudProven) = checkTypeForTransactionsOrderError(
        txOffset, len, 61
      );
    }

    require(fraudProven, "Fraud not found in hard tx range.");
    return state.revertBlock(badHeader);
  }

  /* solhint-enable function-max-lines */
  function checkTypeForTransactionsRangeError(
    uint256 offset, uint256 buffer, uint256 len, uint256 size, uint256 prevTotal
  ) internal pure returns (uint256 newOffset, bool fraudulent) {
    uint256 txIndex;
    uint256 foundIndex;
    uint256 ptr;

    newOffset = offset;
    for (uint256 i = 0; i < len; i++) {
      assembly { txIndex := shr(216, mload(newOffset)) }
      // Check if the hardTransactionIndex is less than the previous total
      if (txIndex < prevTotal) {
        fraudulent = true;
        break;
      }

      // Check if we have already found this hardTransactionIndex
      ptr = buffer + (txIndex - prevTotal);

      assembly { foundIndex := shr(248, mload(ptr)) }

      if (foundIndex == 1) {
        fraudulent = true;
        break;
      }

      // Mark the index as found
      assembly { mstore8(ptr, 1) }

      newOffset += size;
    }
  }

  function checkTypeForTransactionsOrderError(
    uint256 offset, uint256 len, uint256 size
  ) internal pure returns (uint256 newOffset, bool fraudulent) {
    uint256 txIndex;
    uint256 lastIndex = 0;
    newOffset = offset;
    for (uint256 i = 0; i < len; i++) {
      assembly { txIndex := shr(216, mload(newOffset)) }

      // Ensure that each transaction has an index higher than the last
      if (txIndex < lastIndex) {
        fraudulent = true;
        break;
      }

      lastIndex = txIndex;
      newOffset += size;
    }
  }
}