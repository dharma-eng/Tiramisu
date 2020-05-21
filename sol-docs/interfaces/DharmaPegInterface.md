## `DharmaPegInterface`

### `deposit(uint56 value)` (external)

### `deposit(address signerAddress, uint56 value)` (external)

### `forceAddSigner(uint32 accountIndex, address signingAddress)` (external)

### `forceWithdrawal(uint32 accountIndex, uint56 value)` (external)

### `executeWithdrawal(struct BlockLib.BlockHeader header, bytes transaction, uint256 transactionIndex, bytes32[] inclusionProof)` (external)

Executes a withdrawal which exists in a confirmed block and
replaces the leaf with a null value.

executeWithdrawal

### `confirmBlock(struct BlockLib.BlockHeader header)` (external)

### `submitBlock(struct BlockLib.BlockInput input)` (external)

### `getHardTransactionsFrom(uint256 start, uint256 max) → bytes[] hardTransactions` (external)

### `getBlockHash(uint256 height) → bytes32` (external)

### `getBlockCount() → uint256` (external)

### `getConfirmedBlockCount() → uint256` (external)

### `NewHardTransaction(uint256 hardTransactionIndex)`
