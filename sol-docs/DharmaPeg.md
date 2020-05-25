# [🔗](/contracts/DharmaPeg.sol#L17) DharmaPeg

This contract is the interface between Ethereum and the Dharma blockchain.

It tracks the history of the Dharma chain, is the sole arbiter of block validity and owns all tokens which the Dharma chain manages.

New blocks on the sidechain are submitted to this contract and recorded as pending for a period of time called the confirmation period, which is defined in Configurable.sol, during which anyone can audit the block for errors.

This implements functions which allow accounts on Ethereum to record "hard" transactions which the Dharma chain must execute.

If submitted blocks are invalid, anyone may submit a fraud proof to this contract to prove that the block contains some error, which will cause the block to be reverted.

If fraud is proven, the operator (Dharma) will be penalized and the prover will be rewarded.

# Functions

## [🔗](/contracts/DharmaPeg.sol#L56) `deposit(uint56 value)`

Creates a hard deposit/hard create using the caller's address as both the account address and initial signing key.

### Parameters

- `value` Amount of DAI to deposit.

## [🔗](/contracts/DharmaPeg.sol#L75) `deposit(address signerAddress, uint56 value)`

deposit Creates a hard deposit/hard create using the caller's address as the account address and the address provided as the initial signing key.

The contract address can not be provided as an argument, as that would make it possible to claim an account that the caller does not own.

### Parameters

- `signerAddress` Initial signing key for the account.
- `value` Amount of DAI to deposit.

## [🔗](/contracts/DharmaPeg.sol#L101) `forceAddSigner(uint32 accountIndex, address signingAddress)`

forceAddSigner Creates a HardAddSigner transaction which, if the caller is the owner of the account specified, will add the provided signer address to the account's list of signer.

### Parameters

- `accountIndex` Index of the account to add the signer to.
- `signingAddress` Address to add as a new signing key.

## [🔗](/contracts/DharmaPeg.sol#L121) `forceWithdrawal(uint32 accountIndex, uint56 value)`

forceWithdrawal Creates a HardWithdrawal transaction which, if the caller is the owner of the specified account, will withdraw the amount of DAI specified to L1.

### Parameters

- `accountIndex` Index of the account to withdraw from.
- `value` Amount of DAI to withdraw.

## [🔗](/contracts/DharmaPeg.sol#L141) `confirmBlock(Block.BlockHeader header)`

confirmBlock Confirms a pending block if it has passed the confirmation period and has a height one greater than the current confirmed block index.

### Parameters

- `header` Block header to confirm.

## [🔗](/contracts/DharmaPeg.sol#L151) `getHardTransactionsFrom(uint256 start, uint256 max)`

getHardTransactionsFrom Gets `max` hard transactions starting at `start`, or however many transactions have been recorded if there are not `max` available.

### Parameters

- `start` Start index
- `max` Maximum number of hard transactions to retrieve.

### Returns

- `undefined _hardTransactions`

## [🔗](/contracts/DharmaPeg.sol#L171) `getBlockHash(uint256 height)`

getBlockHash Gets the block hash at `height`.

### Parameters

- `height` Block height to retrieve the hash of.

### Returns

- `bytes32`

## [🔗](/contracts/DharmaPeg.sol#L182) `getBlockCount()`

getBlockCount Gets the number of blocks in the state.

### Returns

- `uint256`

## [🔗](/contracts/DharmaPeg.sol#L190) `getConfirmedBlockCount()`

Gets the number of confirmed blocks in the state.

### Returns

- `uint256`

## [🔗](/contracts/DharmaPeg.sol#L197) `executeWithdrawals(Block.BlockHeader parent, Block.BlockHeader header, bytes transactionsData)`

Executes the withdrawals in a confirmed block.

### Parameters

- `parent` Header of the previous block, used to determine which withdrawals were executed.
- `header` Header of the block with the withdrawals to execute
- `transactionsData` Transactions buffer from the block.
  merkle tree.

## [🔗](/contracts/DharmaPeg.sol#L232) `submitBlock(Block.BlockInput input)`

submitBlock Records a block as pending.

Can only be called by `owner`.

### Parameters

- `input` Block input to submit.

## [🔗](/contracts/DharmaPeg.sol#L242) `_deposit(address contractAddress, address signerAddress, uint56 value)`
