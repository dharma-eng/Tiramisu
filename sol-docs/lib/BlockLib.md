## `BlockLib`

### `toCommitment(struct BlockLib.BlockInput blockInput) → struct BlockLib.BlockHeader` (internal)

This function takes a submitted block input and converts it to a
committed block. The transaction bytes are hashed and the hash is placed
in the committed header.

\_toCommitment

### `decodeBlockHeader(bytes data) → struct BlockLib.BlockHeader` (internal)

### `blockHash(struct BlockLib.BlockHeader header) → bytes32` (internal)

### `hasTransactionsData(struct BlockLib.BlockHeader header, bytes txData) → bool` (internal)
