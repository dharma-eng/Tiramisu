# [🔗](/contracts/lib/HardTransactionsLib.sol#L5) HardTransactionsLib
Contains the data structures and utility functions needed for the L1  hard transaction types. These structures are essentially the hard transaction input types, and do not represent the data structures recorded in blocks.



# Data Structures
## [🔗](/contracts/lib/HardTransactionsLib.sol#L13) HardDeposit
### Properties
- `address contractAddress` - The primary address of an account on the L2 system,
which will generally represent a Dharma smart wallet.
- `address signerAddress` - The initial signer address for the Dharma wallet. This
will only be used in hard create transactions. It is recorded due to the
uncertainty about the state of the sidechain.
- `uint56 value` - The DAI value for the deposit.
## [🔗](/contracts/lib/HardTransactionsLib.sol#L30) HardWithdrawal
### Properties
- `uint32 accountIndex` - Index of the account on the L2 chain.
It is presumed that the user has access to this.
- `address caller` - Address of the contract which initiated the withdrawal.
This is needed to check if the caller has approval once the transaction is
executed or rejected.
- `uint56 value` - Amount of dai to withdraw from the account.
## [🔗](/contracts/lib/HardTransactionsLib.sol#L46) HardAddSigner
### Properties
- `uint32 accountIndex` - Index of the account on the L2 chain.
It is presumed that the user has access to this.
- `address caller` - Address of the contract which initiated the transaction.
This is needed to check if the caller has approval once the transaction is
executed or rejected.
- `address signingAddress` - Address to add to the array of signer keys for the
account.
# Functions
## [🔗](/contracts/lib/HardTransactionsLib.sol#L65) `checkTransactionType(bytes encodedTransaction)`

## [🔗](/contracts/lib/HardTransactionsLib.sol#L83) `encode(HardDeposit transaction)`

## [🔗](/contracts/lib/HardTransactionsLib.sol#L96) `decodeHardDeposit(bytes data)`

## [🔗](/contracts/lib/HardTransactionsLib.sol#L117) `encode(HardWithdrawal transaction)`

## [🔗](/contracts/lib/HardTransactionsLib.sol#L128) `decodeHardWithdrawal(bytes data)`

## [🔗](/contracts/lib/HardTransactionsLib.sol#L149) `encode(HardAddSigner transaction)`

## [🔗](/contracts/lib/HardTransactionsLib.sol#L160) `decodeHardAddSigner(bytes data)`

