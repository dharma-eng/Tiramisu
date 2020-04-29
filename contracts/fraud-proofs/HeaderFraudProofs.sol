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
   * @dev _proveStateSizeError
   * Proves that the state size in a block header does not match the expected state size based on
   * the creation transactions in the block.
   * @param state storage struct representing the peg state
   * @param previousHeader block header prior to the fraudulent header
   * @param badHeader block header with error
   * @param transactionsData transactions buffer from the block
   */
  function _proveStateSizeError(
    State.State storage state,
    Block.BlockHeader memory previousHeader,
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) internal {
    state._blockIsPendingAndHasParent(badHeader, previousHeader);

    require(
      badHeader._hasTransactionsData(transactionsData),
      "Header does not match transactions data."
    );

    Tx.TransactionsMetadata memory meta = transactionsData._decodeTransactionsMetadata();
    uint256 failures = transactionsData._countCreateTransactionsWithEmptyRoot(meta);
    uint256 expectedIncrease = (meta.hardCreateCount + meta.softCreateCount) - failures;
    if (badHeader.stateSize != (previousHeader.stateSize + expectedIncrease)) {
      state._revertBlock(badHeader);
    }
  }

  function _putLeaves(
    bytes[] memory leaves,
    bool identitySuccess,
    uint256 leafIndex,
    uint256 currentPointer,
    uint8 typePrefix,
    uint256 typeCount,
    uint256 typeSize
  ) internal view returns (bool _identitySuccess, uint256 _leafIndex, uint256 _currentPointer) {
    for (uint256 i = 0; i < typeCount; i++) {
      bytes memory _tx = new bytes(typeSize + 1);
      assembly {
        let outPtr := add(_tx, 32)
        mstore8(outPtr, typePrefix)
        outPtr := add(outPtr, 1)
        identitySuccess := staticcall(gas(), 0x04, currentPointer, typeSize, outPtr, typeSize)
        currentPointer := add(currentPointer, typeSize)
      }
      leaves[leafIndex++] = _tx;
    }
    return (identitySuccess, leafIndex, currentPointer);
  }

  function _proveTransactionsRootError(
    State.State storage state,
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) internal {
    require(
      state._blockIsPending(badHeader.blockNumber, badHeader._blockHash()),
      "Block not pending."
    );

    require(
      badHeader._hasTransactionsData(transactionsData),
      "Header does not match transactions data."
    );

    Tx.TransactionsMetadata memory meta = transactionsData._decodeTransactionsMetadata();
    uint256 expectedLength = meta._expectedTransactionsLength();
    /* If the transactions data size is incommensurate with the transactions
       header, the block is erroneous. */
    if (transactionsData.length != expectedLength + 16) {
      state._revertBlock(badHeader);
      return;
    }
    uint256 txCount = meta._transactionsCount();
    uint256 txPtr = 48;
    uint256 leafIndex = 0;
    bytes[] memory leaves = new bytes[](txCount);

    bool identitySuccess = true;
    (identitySuccess, leafIndex, txPtr) = _putLeaves(
      leaves, identitySuccess,
      leafIndex, txPtr,
      0, meta.hardCreateCount, 88
    );
    (identitySuccess, leafIndex, txPtr) = _putLeaves(
      leaves, identitySuccess,
      leafIndex, txPtr,
      1, meta.hardDepositCount, 48
    );
    (identitySuccess, leafIndex, txPtr) = _putLeaves(
      leaves, identitySuccess,
      leafIndex, txPtr,
      2, meta.hardWithdrawCount, 48
    );
    (identitySuccess, leafIndex, txPtr) = _putLeaves(
      leaves, identitySuccess,
      leafIndex, txPtr,
      3, meta.hardAddSignerCount, 93
    );
    (identitySuccess, leafIndex, txPtr) = _putLeaves(
      leaves, identitySuccess,
      leafIndex, txPtr,
      4, meta.softWithdrawCount, 131
    );
    (identitySuccess, leafIndex, txPtr) = _putLeaves(
      leaves, identitySuccess,
      leafIndex, txPtr,
      5, meta.softCreateCount, 155
    );
    (identitySuccess, leafIndex, txPtr) = _putLeaves(
      leaves, identitySuccess,
      leafIndex, txPtr,
      6, meta.softTransferCount, 115
    );
    (identitySuccess, leafIndex, txPtr) = _putLeaves(
      leaves, identitySuccess,
      leafIndex, txPtr,
      7, meta.softChangeSignerCount, 125
    );
    bytes32 txRoot = Merkle._getMerkleRoot(leaves);
    if (txRoot != badHeader.transactionsRoot) state._revertBlock(badHeader);
  }

  function _proveHardTransactionRangeError(
    State.State storage state,
    Block.BlockHeader memory previousHeader,
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) internal {
    state._blockIsPendingAndHasParent(badHeader, previousHeader);

    require(
      badHeader._hasTransactionsData(transactionsData),
      "Header does not match transactions data."
    );

    Tx.TransactionsMetadata memory meta = transactionsData._decodeTransactionsMetadata();
    uint256 hardTxSum = (
      meta.hardCreateCount + meta.hardDepositCount +
      meta.hardWithdrawCount + meta.hardAddSignerCount
    );
    if (badHeader.hardTransactionsCount != previousHeader.hardTransactionsCount + hardTxSum) {
      state._revertBlock(badHeader);
    }
  }
}