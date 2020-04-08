pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;
import "./DefaultHashes.sol";

/*
 * Merkle Tree Utilities for Rollup
*/
contract RollupMerkleUtils {
  address public defaultHashStorage;

  constructor() public {
    defaultHashStorage = address(new DefaultHashes());
  }

  function getDefaultHashes()
  internal view returns(bytes32[160] memory defaultHashes) {
    assembly {
      extcodecopy(sload(defaultHashStorage_slot), add(defaultHashes, 0x20), 0, mul(160, 0x20))
    }
  }

  function getDefaultHash(uint256 index)
  internal view returns(bytes32 defaultHash) {
    bytes memory _defaultHash = new bytes(32);
    assembly {
      let ptr := add(_defaultHash, 0x20)
      extcodecopy(sload(defaultHashStorage_slot), ptr, mul(index, 0x20), 0x20)
      defaultHash := mload(ptr)
    }
  }

  /**
   * @notice Get the sparse merkle root computed from some set of data blocks.
   * @param _dataBlocks The data being used to generate the tree.
   * @return the sparse merkle tree root
   */
  function getMerkleRoot(bytes[] calldata _dataBlocks) external view returns(bytes32) {
    uint256 nextLevelLength = _dataBlocks.length;
    uint256 currentLevel = 0;
    bytes32[160] memory defaultHashes = getDefaultHashes();
    bytes32[] memory nodes = new bytes32[](nextLevelLength + 1); // Add one in case we have an odd number of leaves
    // Generate the leaves
    for (uint256 i = 0; i < _dataBlocks.length; i++) {
      nodes[i] = keccak256(_dataBlocks[i]);
    }
    if (_dataBlocks.length == 1) {
      return nodes[0];
    }
    // Add a defaultNode if we've got an odd number of leaves
    if (nextLevelLength % 2 == 1) {
      nodes[nextLevelLength] = defaultHashes[currentLevel];
      nextLevelLength += 1;
    }

    // Now generate each level
    while (nextLevelLength > 1) {
      currentLevel += 1;
      // Calculate the nodes for the currentLevel
      for (uint256 i = 0; i < nextLevelLength / 2; i++) {
        nodes[i] = getParent(nodes[i*2], nodes[i*2 + 1]);
      }
      nextLevelLength = nextLevelLength / 2;
      // Check if we will need to add an extra node
      if (nextLevelLength % 2 == 1 && nextLevelLength != 1) {
        nodes[nextLevelLength] = defaultHashes[currentLevel];
        nextLevelLength += 1;
      }
    }

    // Alright! We should be left with a single node! Return it...
    return nodes[0];
  }

  /**
   * @notice Get the parent of two children nodes in the tree
   * @param _left The left child
   * @param _right The right child
   * @return The parent node
   */
  function getParent(bytes32 _left, bytes32 _right) internal pure returns(bytes32) {
    return keccak256(abi.encodePacked(_left, _right));
  }
}