## `HardTransactionsLib`

Contains the data structures and utility functions needed for the L1
hard transaction types. These structures are essentially the hard
transaction input types, and do not represent the data structures recorded
in blocks.

### `checkTransactionType(bytes encodedTransaction) → enum HardTransactionsLib.HardTransactionType` (internal)

### `encode(struct HardTransactionsLib.HardDeposit transaction) → bytes encodedTransaction` (internal)

### `decodeHardDeposit(bytes data) → struct HardTransactionsLib.HardDeposit hardDeposit` (internal)

### `encode(struct HardTransactionsLib.HardWithdrawal transaction) → bytes encodedTransaction` (internal)

### `decodeHardWithdrawal(bytes data) → struct HardTransactionsLib.HardWithdrawal hardWithdrawal` (internal)

### `encode(struct HardTransactionsLib.HardAddSigner transaction) → bytes encodedTransaction` (internal)

### `decodeHardAddSigner(bytes data) → struct HardTransactionsLib.HardAddSigner hardAddSigner` (internal)
