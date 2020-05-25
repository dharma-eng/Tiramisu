# [🔗](/contracts/lib/TransactionsLib.sol#L5) TransactionsLib
# Data Structures
## [🔗](/contracts/lib/TransactionsLib.sol#L17) TransactionsMetadata
### Properties
- `uint16 hardCreateCount`
- `uint16 hardDepositCount`
- `uint16 hardWithdrawCount`
- `uint16 hardAddSignerCount`
- `uint16 softWithdrawCount`
- `uint16 softCreateCount`
- `uint16 softTransferCount`
- `uint16 softChangeSignerCount`
## [🔗](/contracts/lib/TransactionsLib.sol#L28) HardCreate
### Properties
- `uint40 hardTransactionIndex`
- `uint32 accountIndex`
- `uint56 value`
- `address contractAddress`
- `address signerAddress`
- `bytes32 intermediateStateRoot`
## [🔗](/contracts/lib/TransactionsLib.sol#L37) HardDeposit
### Properties
- `uint40 hardTransactionIndex`
- `uint32 accountIndex`
- `uint56 value`
- `bytes32 intermediateStateRoot`
## [🔗](/contracts/lib/TransactionsLib.sol#L44) HardWithdrawal
### Properties
- `uint40 hardTransactionIndex`
- `uint32 accountIndex`
- `address withdrawalAddress`
- `uint56 value`
- `bytes32 intermediateStateRoot`
## [🔗](/contracts/lib/TransactionsLib.sol#L52) HardAddSigner
### Properties
- `uint40 hardTransactionIndex`
- `uint32 accountIndex`
- `address signingAddress`
- `bytes32 intermediateStateRoot`
## [🔗](/contracts/lib/TransactionsLib.sol#L59) SoftWithdrawal
### Properties
- `uint24 nonce`
- `uint32 accountIndex`
- `address withdrawalAddress`
- `uint56 value`
- `uint8 sigV`
- `bytes32 sigR`
- `bytes32 sigS`
- `bytes32 intermediateStateRoot`
## [🔗](/contracts/lib/TransactionsLib.sol#L70) SoftCreate
### Properties
- `uint24 nonce`
- `uint32 fromIndex`
- `uint32 toIndex`
- `uint56 value`
- `address contractAddress`
- `address signingAddress`
- `uint8 sigV`
- `bytes32 sigR`
- `bytes32 sigS`
- `bytes32 intermediateStateRoot`
## [🔗](/contracts/lib/TransactionsLib.sol#L83) SoftTransfer
### Properties
- `uint24 nonce`
- `uint32 fromIndex`
- `uint32 toIndex`
- `uint56 value`
- `uint8 sigV`
- `bytes32 sigR`
- `bytes32 sigS`
- `bytes32 intermediateStateRoot`
## [🔗](/contracts/lib/TransactionsLib.sol#L94) SoftChangeSigner
### Properties
- `uint24 nonce`
- `uint32 fromIndex`
- `address signingAddress`
- `uint8 modificationCategory`
- `uint8 sigV`
- `bytes32 sigR`
- `bytes32 sigS`
- `bytes32 intermediateStateRoot`
# Functions
## [🔗](/contracts/lib/TransactionsLib.sol#L105) `decodeTransactionsMetadata(bytes input)`

## [🔗](/contracts/lib/TransactionsLib.sol#L135) `decodeHardCreate(bytes input)`

## [🔗](/contracts/lib/TransactionsLib.sol#L160) `decodeHardDeposit(bytes input)`

## [🔗](/contracts/lib/TransactionsLib.sol#L180) `decodeHardWithdrawal(bytes input)`

## [🔗](/contracts/lib/TransactionsLib.sol#L202) `decodeHardAddSigner(bytes input)`

## [🔗](/contracts/lib/TransactionsLib.sol#L222) `decodeSoftWithdrawal(bytes input)`

## [🔗](/contracts/lib/TransactionsLib.sol#L252) `decodeSoftCreate(bytes input)`

## [🔗](/contracts/lib/TransactionsLib.sol#L287) `decodeSoftTransfer(bytes input)`

## [🔗](/contracts/lib/TransactionsLib.sol#L317) `decodeSoftChangeSigner(bytes input)`

## [🔗](/contracts/lib/TransactionsLib.sol#L347) `stateRootFromTransaction(bytes transaction)`

stateRootFromTransaction Reads the state root from a transaction by peeling off the last 32 bytes.




### Parameters
* `transaction` - encoded transaction of any type
### Returns
* `bytes32 root` root - state root from the transaction

## [🔗](/contracts/lib/TransactionsLib.sol#L364) `transactionPrefix(bytes transaction)`

transactionPrefix Returns the transaction prefix from an encoded transaction by reading the first byte.




### Parameters
* `transaction` - encoded transaction of any type
### Returns
* `uint8 prefix` prefix - transaction prefix read from the first byte of the transaction

## [🔗](/contracts/lib/TransactionsLib.sol#L376) `transactionsCount(TransactionsMetadata meta)`

transactionsCount Returns the total number of transactions in the tx metadata.




### Parameters
* `meta` - transactions metadata from a transaction buffer
### Returns
* `uint256` number of transactions the metadata says exist in the buffer

## [🔗](/contracts/lib/TransactionsLib.sol#L397) `expectedTransactionsLength(TransactionsMetadata meta)`

expectedTransactionsLength Calculates the expected size of the transactions buffer based on the transactions metadata.




### Parameters
* `meta` - transactions metadata from a transaction buffer
### Returns
* `uint256` number of bytes the transactions buffer should have

## [🔗](/contracts/lib/TransactionsLib.sol#L418) `putLeaves(undefined leaves, bool identitySuccess, uint256 leafIndex, uint256 currentPointer, uint8 typePrefix, uint256 typeCount, uint256 typeSize)`

## [🔗](/contracts/lib/TransactionsLib.sol#L446) `deriveTransactionsRoot(bytes transactionsData)`

## [🔗](/contracts/lib/TransactionsLib.sol#L490) `recoverSignature(bytes txData)`

