pragma solidity ^0.6.0;

library BlockLib {
  /* <-- Data Structures --> */
  struct BlockHeader {
    uint16 version;
    uint32 blockNumber;
    uint32 stateSize;
    bytes32 stateRoot;
    bytes32 transactionsRoot;
    bytes32 transactionsHash;
    uint256 submittedAt;
  }

  struct HeaderInput {
    uint16 version;
    uint32 blockNumber;
    uint32 stateSize;
    bytes32 stateRoot;
    bytes32 transactionsRoot;
  }

  /**
    * @dev BlockInput
    * @notice Data structure sent in a block submission.
    */
  struct BlockInput {
    HeaderInput header;
    bytes transactionsData;
  }

  /* <-- Events --> */
  event BlockSubmitted(uint32 indexed blockNumber, bytes32 blockHash);

  /* <-- Utility Functions --> */
  /**
    * @dev toCommitment
    * @notice This function takes a submitted block input and converts it to a committed block. 
    * The transaction bytes are hashed and the hash is placed in the committed header.
    * @param blockInput - Block input data submitted with a block submission.
    */
  function toCommitment(BlockInput memory blockInput) internal view returns (BlockHeader memory) {
    return BlockHeader(
      blockInput.header.version,
      blockInput.header.blockNumber,
      blockInput.header.stateSize,
      blockInput.header.stateRoot,
      blockInput.header.transactionsRoot,
      keccak256(blockInput.transactionsData),
      block.number // current block number, used for challenge period timing
    );
  }
}