pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


library MerkleProofLib {
  struct MerkleProof {
    bytes32 root;
    uint256 index;
    bytes32[] siblings;
  }

  /**
   * @notice Verify an inclusion proof of some value, modify the value and return the new root.
   * @param _root The root of the tree we are verifying inclusion for.
   * @param _oldLeaf The leaf node we're verifying inclusion for.
   * @notice leaf must be greater than 32 bytes. This is a decision made specifically for ISO, and is intended
   *         to prevent valid proofs of non-leaf values.
   * @param _newLeaf The leaf node we're replacing _oldLeaf with.
   * @param _path The path from the leaf to the root.
   * @param _siblings The sibling nodes along the way.
   * @return _valid Boolean stating whether the proof was valid.
   * @return _updatedRoot Merkle root with _oldLeaf set to _newLeaf.
   */
  function verifyAndUpdate(bytes32 _root, bytes memory _oldLeaf, bytes memory _newLeaf, uint256 _path, bytes32[] memory _siblings)
  internal pure returns (bool _valid, bytes32 _updatedRoot) {
    if (_oldLeaf.length == 32) return (false, _root);
    // First compute the leaf node
    _updatedRoot = keccak256(_newLeaf);
    bytes32 computedNode = keccak256(_oldLeaf);
    for (uint256 i = 0; i < _siblings.length; i++) {
      bytes32 sibling = _siblings[i];
      uint8 isComputedRightSibling = getNthBitFromRight(_path, i);
      if (isComputedRightSibling == 0) {
        computedNode = getParent(computedNode, sibling);
        _updatedRoot = getParent(_updatedRoot, sibling);
      } else {
        computedNode = getParent(sibling, computedNode);
        _updatedRoot = getParent(sibling, _updatedRoot);
      }
    }
    // Check if the computed node (_root) is equal to the provided root
    _valid = computedNode == _root;
  }

  /**
   * @notice Verify an inclusion proof.
   * @param _root The root of the tree we are verifying inclusion for.
   * @param leaf The leaf node we're verifying inclusion for.
   * @notice leaf must be greater than 32 bytes. This is a decision made specifically for ISO, and is intended
   * to prevent valid proofs of non-leaf values.
   * @param _path The path from the leaf to the root.
   * @param _siblings The sibling nodes along the way.
   * @return Boolean stating whether the proof was valid.
   */
  function verify(bytes32 _root, bytes memory leaf, uint256 _path, bytes32[] memory _siblings)
  internal pure returns (bool) {
    if (leaf.length == 32) return false;
    // First compute the leaf node
    bytes32 computedNode = keccak256(leaf);
    for (uint256 i = 0; i < _siblings.length; i++) {
      bytes32 sibling = _siblings[i];
      uint8 isComputedRightSibling = getNthBitFromRight(_path, i);
      if (isComputedRightSibling == 0) {
        computedNode = getParent(computedNode, sibling);
      } else {
        computedNode = getParent(sibling, computedNode);
      }
    }
    // Check if the computed node (_root) is equal to the provided root
    return computedNode == _root;
  }

  function verify(bytes memory leaf, MerkleProof memory proof) internal pure returns(bool) {
    return verify(proof.root, leaf, proof.index, proof.siblings);
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