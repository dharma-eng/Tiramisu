pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { BlockLib as Block } from "../lib/BlockLib.sol";
import { StateLib as State } from "../lib/StateLib.sol";
import { MerkleProofLib as Merkle } from "../lib/merkle/MerkleProofLib.sol";

library FraudUtilsLib {
  using Block for Block.BlockHeader;
  using State for State.State;

  struct TransactionProof {
    bytes transactionData;
    bytes32[] siblings;
  }

  function decodeTransactionProof(bytes memory proof) internal pure returns (TransactionProof memory) {
    return abi.decode((proof), (TransactionProof));
  }

  function transactionHadPreviousState(
    State.State storage state,
    bytes memory previousSource,
    Block.BlockHeader memory blockHeader,
    uint256 transactionIndex
  ) internal view returns(bytes32) {
    if (transactionIndex == 0) {
      Block.BlockHeader memory previousHeader = Block.decodeBlockHeader(previousSource);
      require(state.blockHashes[previousHeader.blockNumber] == Block.blockHash(previousHeader), "Header not in array.");
      require(blockHeader.blockNumber == previousHeader.blockNumber + 1, "Block number does not match.");
      return previousHeader.stateRoot;
    }
    TransactionProof memory proof = decodeTransactionProof(previousSource);
    require(Merkle.verify(
      blockHeader.transactionsRoot,
      proof.transactionData,
      transactionIndex - 1,
      proof.siblings
    ), "Invalid merkle root.");
    bytes memory data = proof.transactionData;
    bytes32 root;
    assembly { root := mload(
      add(add(data, 32), sub(mload(data), 32))
    ) }
    return root;
  }
}