pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { BlockLib as Block } from "../lib/BlockLib.sol";
import { StateLib as State } from "../lib/StateLib.sol";
import { AccountLib as Account } from "../lib/AccountLib.sol";
import { MerkleProofLib as Merkle } from "../lib/merkle/MerkleProofLib.sol";


library FraudUtilsLib {
  using Block for Block.BlockHeader;
  using State for State.State;

  struct TransactionProof {
    bytes transactionData;
    bytes32[] siblings;
  }

  /**
   * @dev Verifies the state root prior to a transaction.
   * @param state storage struct representing the peg state
   * @param previousRootProof ABI encoded form of either a block header or a transaction inclusion proof
   * @param blockHeader Header of the block with the original transaction
   * @param transactionIndex Index of the original transaction
   */
  function transactionHadPreviousState(
    State.State storage state,
    bytes memory previousRootProof,
    Block.BlockHeader memory blockHeader,
    uint256 transactionIndex
  ) internal view returns (bytes32) {
    if (transactionIndex == 0) {
      Block.BlockHeader memory previousHeader = Block.decodeBlockHeader(
        previousRootProof
      );

      require(
        state.blockHashes[previousHeader.blockNumber] == Block.blockHash(
          previousHeader
        ),
        "Header not in array."
      );

      require(
        blockHeader.blockNumber == previousHeader.blockNumber + 1,
        "Block number does not match."
      );

      return previousHeader.stateRoot;
    }

    TransactionProof memory proof = abi.decode(
      (previousRootProof), (TransactionProof)
    );

    require(
      Merkle.verify(
        blockHeader.transactionsRoot,
        proof.transactionData,
        transactionIndex - 1,
        proof.siblings
      ),
      "Invalid merkle proof."
    );

    bytes memory data = proof.transactionData;

    // Read the state root from the last word of the transaction and return it.
    bytes32 root;
    assembly { root := mload(add(data, mload(data))) }
    return root;
  }

  /**
   * @dev Verifies the state of an account in the state root prior to a transaction.
   * @param state storage struct representing the peg state
   * @param badHeader Header of the block with the original transaction
   * @param transactionIndex Index of the original transaction
   * @param previousStateProof ABI encoded form of either a block header or a transaction inclusion proof
   * @param stateProof Merkle proof of the account in the previous state root.
   */
  function verifyPreviousAccountState(
    State.State storage state,
    Block.BlockHeader memory badHeader,
    uint256 transactionIndex,
    bytes memory previousStateProof,
    bytes memory stateProof
  ) internal view returns (
    bool empty,
    uint256 accountIndex,
    bytes32[] memory siblings,
    Account.Account memory account
  ) {
    bytes32 previousStateRoot = transactionHadPreviousState(
      state, previousStateProof, badHeader, transactionIndex
    );

    (empty, accountIndex, siblings, account) = Account.verifyAccountInState(
      previousStateRoot, stateProof
    );
  }

  struct TransactionStateProof {
    uint256 transactionIndex;
    bytes32[] siblings;
    bytes previousRootProof;
  }

  /**
   * @dev validateTransactionStateProof
   * Decodes and validates a TransactionStateProof, which contains
   * an inclusion proof for a transaction and the state root prior to
   * its execution.
   * @param state storage struct representing the state of Tiramisu
   * @param proofBytes encoded TransactionStateProof
   * @param transactionBytes encoded transaction to verify inclusion proof of
   * @return root state root prior to the transaction
   */
  function validateTransactionStateProof(
    State.State storage state,
    Block.BlockHeader memory header,
    bytes memory proofBytes,
    bytes memory transactionBytes
  ) internal view returns (bytes32 root) {
    TransactionStateProof memory proof = abi.decode(
      (proofBytes), (TransactionStateProof)
    );

    require(
      state.blockIsPending(header.blockNumber, header.blockHash()),
      "Block not pending."
    );
    require(
      Merkle.verify(
        header.transactionsRoot,
        transactionBytes,
        proof.transactionIndex,
        proof.siblings
      ),
      "Invalid transaction proof."
    );
    return transactionHadPreviousState(
      state,
      proof.previousRootProof,
      header,
      proof.transactionIndex
    );
  }
}