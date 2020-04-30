pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


library MerkleProofLib {
  struct MerkleProof {
    bytes32 root;
    uint256 index;
    bytes32[] siblings;
  }

  /**
   * @notice Verify an inclusion proof of some value, modify the value and
   * return the new root.
   * @param root The root of the tree we are verifying inclusion for.
   * @param oldLeaf The leaf node we're verifying inclusion for. Leaves must be
   * greater than 32 bytes to prevent valid proofs of non-leaf values.
   * @param newLeaf The leaf node we're replacing oldLeaf with.
   * @param path The path from the leaf to the root.
   * @param siblings The sibling nodes along the way.
   * @return valid Boolean stating whether the proof was valid.
   * @return updatedRoot Merkle root with oldLeaf set to newLeaf.
   */
  function verifyAndUpdate(
    bytes32 root,
    bytes memory oldLeaf,
    bytes memory newLeaf,
    uint256 path,
    bytes32[] memory siblings
  ) internal pure returns (bool valid, bytes32 updatedRoot) {
    if (oldLeaf.length == 32) return (false, root);
    // First compute the leaf node
    updatedRoot = keccak256(newLeaf);
    bytes32 computedNode = keccak256(oldLeaf);
    for (uint256 i = 0; i < siblings.length; i++) {
      bytes32 sibling = siblings[i];
      uint8 isComputedRightSibling = getNthBitFromRight(path, i);
      if (isComputedRightSibling == 0) {
        computedNode = getParent(computedNode, sibling);
        updatedRoot = getParent(updatedRoot, sibling);
      } else {
        computedNode = getParent(sibling, computedNode);
        updatedRoot = getParent(sibling, updatedRoot);
      }
    }
    // Check if the computed node (root) is equal to the provided root
    valid = computedNode == root;
  }

  /**
   * @notice Verify an inclusion proof.
   * @param root The root of the tree we are verifying inclusion for.
   * @param leaf The leaf node we're verifying inclusion for. Leaves must be
   * greater than 32 bytes to prevent valid proofs of non-leaf values.
   * @param path The path from the leaf to the root.
   * @param siblings The sibling nodes along the way.
   * @return Boolean stating whether the proof was valid.
   */
  function verify(
    bytes32 root, bytes memory leaf, uint256 path, bytes32[] memory siblings
  ) internal pure returns (bool) {
    if (leaf.length == 32) return false;
    // First compute the leaf node
    bytes32 computedNode = keccak256(leaf);
    for (uint256 i = 0; i < siblings.length; i++) {
      bytes32 sibling = siblings[i];
      uint8 isComputedRightSibling = getNthBitFromRight(path, i);
      if (isComputedRightSibling == 0) {
        computedNode = getParent(computedNode, sibling);
      } else {
        computedNode = getParent(sibling, computedNode);
      }
    }
    // Check if the computed node (root) is equal to the provided root
    return computedNode == root;
  }

  function verify(
    bytes memory leaf, MerkleProof memory proof
  ) internal pure returns (bool) {
    return verify(proof.root, leaf, proof.index, proof.siblings);
  }

  /**
   * @notice Get the parent of two children nodes in the tree
   * @param left The left child
   * @param right The right child
   * @return The parent node
   */
  function getParent(
    bytes32 left, bytes32 right
  ) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(left, right));
  }

  /**
   * @notice get the n'th bit in a uint.
   *         For instance, if exampleUint=binary(11), getNth(exampleUint, 0) == 1, getNth(2, 1) == 1
   * @param intVal The uint256 we are extracting a bit out of
   * @param index The index of the bit we want to extract
   * @return The bit (1 or 0) in a uint8
   */
  function getNthBitFromRight(
    uint256 intVal, uint256 index
  ) internal pure returns (uint8) {
    return uint8(intVal >> index & 1);
  }
}