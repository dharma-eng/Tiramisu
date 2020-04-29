pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


library MerkleTreeLib {
  function _getMerkleRoot(
    bytes[] memory leaves
  ) internal pure returns (bytes32 root) {
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
        // Get the parent of the left and right children nodes in the tree.
        nodes[i] = keccak256(abi.encodePacked(nodes[i*2], nodes[i*2 + 1]));
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
}