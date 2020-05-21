## `TransactionsLib`

### `decodeHardCreate(bytes transaction) → struct TransactionsLib.HardCreate hardCreate` (internal)

### `decodeHardDeposit(bytes transaction) → struct TransactionsLib.HardDeposit hardDeposit` (internal)

### `decodeHardWithdrawal(bytes transaction) → struct TransactionsLib.HardWithdrawal hardWithdrawal` (internal)

### `decodeHardAddSigner(bytes transaction) → struct TransactionsLib.HardAddSigner hardAddSigner` (internal)

### `decodeSoftWithdrawal(bytes transaction) → struct TransactionsLib.SoftWithdrawal softWithdrawal` (internal)

### `decodeSoftCreate(bytes transaction) → struct TransactionsLib.SoftCreate softCreate` (internal)

### `decodeSoftTransfer(bytes transaction) → struct TransactionsLib.SoftTransfer softTransfer` (internal)

### `decodeSoftChangeSigner(bytes transaction) → struct TransactionsLib.SoftChangeSigner softChangeSigner` (internal)

### `decodeTransactionsMetadata(bytes transactions) → struct TransactionsLib.TransactionsMetadata meta` (internal)

decodeTransactionsMetadata
Decodes the first 16 bytes of a block's transactions buffer into a metadata struct.

### `stateRootFromTransaction(bytes transaction) → bytes32 root` (internal)

stateRootFromTransaction
Reads the state root from a transaction by peeling off the last 32 bytes.

### `countCreateTransactionsWithEmptyRoot(bytes txData, struct TransactionsLib.TransactionsMetadata meta) → uint256 count` (internal)

countCreateTransactionsWithEmptyRoot
Counts the number of hard create transactions in a transactions buffer which failed to execute.

### `transactionPrefix(bytes transaction) → uint8 prefix` (internal)

transactionPrefix
Returns the transaction prefix from an encoded transaction by reading the first byte.

### `transactionsCount(struct TransactionsLib.TransactionsMetadata meta) → uint256` (internal)

transactionsCount
Returns the total number of transactions in the tx metadata.

### `expectedTransactionsLength(struct TransactionsLib.TransactionsMetadata meta) → uint256` (internal)

expectedTransactionsLength
Calculates the expected size of the transactions buffer based on the transactions metadata.

### `putLeaves(bytes[] leaves, bool identitySuccess, uint256 leafIndex, uint256 currentPointer, uint8 typePrefix, uint256 typeCount, uint256 typeSize) → bool _identitySuccess, uint256 _leafIndex, uint256 _currentPointer` (internal)

### `deriveTransactionsRoot(bytes transactionsData) → bytes32` (internal)

### `recoverSignature(bytes txData) → address signer` (internal)
