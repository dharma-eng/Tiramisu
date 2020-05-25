# [🔗](/contracts/lib/merkle/MerkleProofLib.sol#L5) MerkleProofLib

# Data Structures

## [🔗](/contracts/lib/merkle/MerkleProofLib.sol#L6) MerkleProof

### Properties

- `bytes32 root`
- `uint256 index`
- `undefined siblings`

# Functions

## [🔗](/contracts/lib/merkle/MerkleProofLib.sol#L12) `update(bytes newLeaf, uint256 path, undefined siblings)`

## [🔗](/contracts/lib/merkle/MerkleProofLib.sol#L27) `verifyAndUpdate(bytes32 root, bytes oldLeaf, bytes newLeaf, uint256 path, undefined siblings)`

Verify an inclusion proof of some value, modify the value and return the new root.

### Parameters

- `root` The root of the tree we are verifying inclusion for.
- `oldLeaf` The leaf node we're verifying inclusion for. Leaves must be
  greater than 32 bytes to prevent valid proofs of non-leaf values.
- `newLeaf` The leaf node we're replacing oldLeaf with.
- `path` The path from the leaf to the root.
- `siblings` The sibling nodes along the way.

### Returns

- `bool valid` updatedRoot Merkle root with oldLeaf set to newLeaf.
- `bytes32 updatedRoot` updatedRoot Merkle root with oldLeaf set to newLeaf.

## [🔗](/contracts/lib/merkle/MerkleProofLib.sol#L70) `verify(bytes32 root, bytes leaf, uint256 path, undefined siblings)`

Verify an inclusion proof.

### Parameters

- `root` The root of the tree we are verifying inclusion for.
- `leaf` The leaf node we're verifying inclusion for. Leaves must be
  greater than 32 bytes to prevent valid proofs of non-leaf values.
- `path` The path from the leaf to the root.
- `siblings` The sibling nodes along the way.

### Returns

- `bool` Boolean stating whether the proof was valid.

## [🔗](/contracts/lib/merkle/MerkleProofLib.sol#L103) `verify(bytes leaf, MerkleProof proof)`

## [🔗](/contracts/lib/merkle/MerkleProofLib.sol#L109) `getParent(bytes32 left, bytes32 right)`

Get the parent of two children nodes in the tree

### Parameters

- `left` The left child
- `right` The right child

### Returns

- `bytes32` The parent node

## [🔗](/contracts/lib/merkle/MerkleProofLib.sol#L121) `getNthBitFromRight(uint256 intVal, uint256 index)`

get the n'th bit in a uint.

        For instance, if exampleUint=binary(11), getNth(exampleUint, 0) == 1, getNth(2, 1) == 1

### Parameters

- `intVal` The uint256 we are extracting a bit out of
- `index` The index of the bit we want to extract

### Returns

- `uint8` The bit (1 or 0) in a uint8
