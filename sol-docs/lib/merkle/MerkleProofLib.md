## `MerkleProofLib`

### `update(bytes newLeaf, uint256 path, bytes32[] siblings) → bytes32 updatedRoot` (internal)

### `verifyAndUpdate(bytes32 root, bytes oldLeaf, bytes newLeaf, uint256 path, bytes32[] siblings) → bool valid, bytes32 updatedRoot` (internal)

Verify an inclusion proof of some value, modify the value and
return the new root.

### `verify(bytes32 root, bytes leaf, uint256 path, bytes32[] siblings) → bool` (internal)

Verify an inclusion proof.

### `verify(bytes leaf, struct MerkleProofLib.MerkleProof proof) → bool` (internal)

### `getParent(bytes32 left, bytes32 right) → bytes32` (internal)

Get the parent of two children nodes in the tree

### `getNthBitFromRight(uint256 intVal, uint256 index) → uint8` (internal)

get the n'th bit in a uint.
For instance, if exampleUint=binary(11), getNth(exampleUint, 0) == 1, getNth(2, 1) == 1
