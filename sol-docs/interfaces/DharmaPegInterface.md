# [🔗](contracts/interfaces/DharmaPegInterface.sol#L7) DharmaPegInterface

# Functions

## [🔗](contracts/interfaces/DharmaPegInterface.sol#L11) `deposit(uint56 value)`

## [🔗](contracts/interfaces/DharmaPegInterface.sol#L13) `deposit(address signerAddress, uint56 value)`

## [🔗](contracts/interfaces/DharmaPegInterface.sol#L15) `forceAddSigner(uint32 accountIndex, address signingAddress)`

## [🔗](contracts/interfaces/DharmaPegInterface.sol#L19) `forceWithdrawal(uint32 accountIndex, uint56 value)`

## [🔗](contracts/interfaces/DharmaPegInterface.sol#L21) `executeWithdrawals(Block.BlockHeader parent, Block.BlockHeader header, bytes transactionsData)`

Executes the withdrawals in a confirmed block.

### Parameters

- `parent` Header of the previous block, used to determine which withdrawals were executed.
- `header` Header of the block with the withdrawals to execute
- `transactionsData` Transactions buffer from the block.
  merkle tree.

## [🔗](contracts/interfaces/DharmaPegInterface.sol#L34) `confirmBlock(Block.BlockHeader header)`

## [🔗](contracts/interfaces/DharmaPegInterface.sol#L36) `submitBlock(Block.BlockInput input)`

## [🔗](contracts/interfaces/DharmaPegInterface.sol#L38) `getHardTransactionsFrom(uint256 start, uint256 max)`

## [🔗](contracts/interfaces/DharmaPegInterface.sol#L42) `getBlockHash(uint256 height)`

## [🔗](contracts/interfaces/DharmaPegInterface.sol#L44) `getBlockCount()`

## [🔗](contracts/interfaces/DharmaPegInterface.sol#L46) `getConfirmedBlockCount()`
