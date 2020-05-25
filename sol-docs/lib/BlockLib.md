# [🔗](/contracts/lib/BlockLib.sol#L5) BlockLib
# Data Structures
## [🔗](/contracts/lib/BlockLib.sol#L8) BlockHeader
### Properties
- `uint16 version`
- `uint32 blockNumber`
- `uint32 stateSize`
- `bytes32 stateRoot`
- `uint40 hardTransactionsCount`
- `bytes32 transactionsRoot`
- `bytes32 transactionsHash`
- `uint256 submittedAt`
## [🔗](/contracts/lib/BlockLib.sol#L19) HeaderInput
### Properties
- `uint16 version`
- `uint32 blockNumber`
- `uint32 stateSize`
- `bytes32 stateRoot`
- `uint40 hardTransactionsCount`
- `bytes32 transactionsRoot`
## [🔗](/contracts/lib/BlockLib.sol#L28) BlockInput
### Properties
- `HeaderInput header`
- `bytes transactionsData`
# Functions
## [🔗](/contracts/lib/BlockLib.sol#L39) `toCommitment(BlockInput blockInput)`

_toCommitment

This function takes a submitted block input and converts it to a committed block. The transaction bytes are hashed and the hash is placed in the committed header.




### Parameters
* `blockInput` - Block input data submitted with a block submission.
### Returns
* `BlockHeader`

## [🔗](/contracts/lib/BlockLib.sol#L61) `decodeBlockHeader(bytes data)`

## [🔗](/contracts/lib/BlockLib.sol#L67) `blockHash(BlockHeader header)`

## [🔗](/contracts/lib/BlockLib.sol#L73) `hasTransactionsData(BlockHeader header, bytes txData)`

