## `DharmaPeg`

### `constructor(uint256 challengePeriod_, uint256 commitmentBond_, uint256 version_, uint256 changeDelay_, contract IDharmaAddressGetter addressHandler_, contract IERC20 daiContract_)` (public)

### `_deposit(address contractAddress, address signerAddress, uint56 value)` (internal)

### `deposit(uint56 value)` (external)

deposit
Creates a hard deposit/hard create using the caller's address
as both the account address and initial signing key.

### `deposit(address signerAddress, uint56 value)` (external)

The contract address can not be provided as an argument,
as that would make it possible to claim an account that the caller
does not own.

deposit
Creates a hard deposit/hard create using the caller's address as the
account address and the address provided as the initial signing key.

### `forceAddSigner(uint32 accountIndex, address signingAddress)` (external)

forceAddSigner
Creates a HardAddSigner transaction which, if the caller is the owner
of the account specified, will add the provided signer address to the
account's list of signer.

### `forceWithdrawal(uint32 accountIndex, uint56 value)` (external)

forceWithdrawal
Creates a HardWithdrawal transaction which, if the caller is the
owner of the specified account, will withdraw the amount of DAI
specified to L1.

### `confirmBlock(struct BlockLib.BlockHeader header)` (external)

confirmBlock
Confirms a pending block if it has passed the confirmation period
and has a height one greater than the current confirmed block index.

### `getHardTransactionsFrom(uint256 start, uint256 max) → bytes[] _hardTransactions` (external)

getHardTransactionsFrom
Gets `max` hard transactions starting at `start`, or however
many transactions have been recorded if there are not `max` available.

### `getBlockHash(uint256 height) → bytes32` (external)

getBlockHash
Gets the block hash at `height`.

### `getBlockCount() → uint256` (external)

getBlockCount
Gets the number of blocks in the state.

### `getConfirmedBlockCount() → uint256` (external)

getConfirmedBlockCount
Gets the number of confirmed blocks in the state.

### `executeWithdrawal(struct BlockLib.BlockHeader header, bytes transaction, uint256 transactionIndex, bytes32[] inclusionProof)` (public)

Executes a withdrawal which exists in a confirmed block and
replaces the leaf with a null value.

executeWithdrawal

### `submitBlock(struct BlockLib.BlockInput input)` (public)

Can only be called by `owner`.

submitBlock
Records a block as pending.
