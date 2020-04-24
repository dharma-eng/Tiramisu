pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

library MerkleTreeLib {
  function getMerkleRoot(bytes[] memory leaves) internal pure returns(bytes32 root) {
    if (leaves.length == 0) return bytes32(0);
    uint256 nextLevelLength = leaves.length;
    uint256 currentLevel = 0;
    bytes32[] memory nodes = new bytes32[](nextLevelLength + 1); // Add one in case we have an odd number of leaves
    // Generate the leaves
    for (uint256 i = 0; i < leaves.length; i++) nodes[i] = keccak256(leaves[i]);
    if (leaves.length == 1) return nodes[0];
    // Add a defaultNode if we've got an odd number of leaves
    if (nextLevelLength % 2 == 1) {
      nodes[nextLevelLength] = bytes32(0);
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
        nodes[nextLevelLength] = bytes32(0);
        nextLevelLength += 1;
      }
    }
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

  /**
   * @notice get the n'th bit in a uint.
   *         For instance, if exampleUint=binary(11), getNth(exampleUint, 0) == 1, getNth(2, 1) == 1
   * @param _intVal The uint256 we are extracting a bit out of
   * @param _index The index of the bit we want to extract
   * @return The bit (1 or 0) in a uint8
   */
  function getNthBitFromRight(uint256 _intVal, uint256 _index) internal pure returns (uint8) {
    return uint8(_intVal >> _index & 1);
  }
}