# [🔗](contracts/lib/AccountLib.sol#L7) AccountLib

# Data Structures

## [🔗](contracts/lib/AccountLib.sol#L8) Account

### Properties

- `address contractAddress`
- `uint24 nonce`
- `uint56 balance`
- `undefined signers`

## [🔗](contracts/lib/AccountLib.sol#L15) StateProof

### Properties

- `bytes data`
- `uint256 accountIndex`
- `undefined siblings`

# Functions

## [🔗](contracts/lib/AccountLib.sol#L21) `newAccount(address contractAddress, address signerAddress, uint56 balance)`

newAccount Creates a new account struct with the provided inputs.

### Parameters

- `contractAddress` Address of the Dharma smart wallet that owns
  the account.
- `signerAddress` Initial signing key for the account.
- `balance` Initial balance of the account.

### Returns

- `Account`

## [🔗](contracts/lib/AccountLib.sol#L37) `updateAccount(Account account, uint256 accountIndex, undefined siblings)`

updateAccount Updates the leaf node in the state tree with the modified account structure.

### Parameters

- `account` Updated account object.
- `accountIndex` Index of the account in the state tree.
- `siblings` Merkle proof of the previous state of the account, which
  is used to derive the new merkle root.

### Returns

- `bytes32 updatedRoot` updatedRoot - Root hash of the merkle tree after applying the update.

## [🔗](contracts/lib/AccountLib.sol#L53) `verifyAccountInState(bytes32 stateRoot, bytes encoded)`

verifyAccountInState Verifies that an account exists in the provided state root and returns the account struct, the index of the account in the tree, the merkle proof (which is used for updates, where necessary) and whether the account was empty.

If the account does not exist (because the leaf at the index is null), but a valid merkle proof is provided, this will return `empty=true` along with a default account struct.

### Parameters

- `stateRoot` Root hash of the state tree.
- `encoded` Encoded StateProof object

### Returns

- `bool empty`
- `uint256 accountIndex`
- `undefined siblings`
- `Account account`

## [🔗](contracts/lib/AccountLib.sol#L96) `hasSigner(Account account, address signer)`

hasSigner Returns a boolean stating whether `signer` is in the `signers` array of `account`.

### Parameters

- `account` Account struct to check
- `signer` Address to look for

### Returns

- `bool`

## [🔗](contracts/lib/AccountLib.sol#L115) `addSigner(Account account, address signer)`

addSigner Adds an address to the account's array of signers.

### Parameters

- `account` Account struct to add the signer to.
- `signer` Signing address to add.

## [🔗](contracts/lib/AccountLib.sol#L129) `removeSigner(Account account, address signer)`

addSigner Removes an address from the account's array of signers.

This function creates a new array and reassigns the `signers` field in the account struct, because Solidity does not allow resizing arrays.

### Parameters

- `account` Account struct to remove the signer from.
- `signer` Signing address to remove.

## [🔗](contracts/lib/AccountLib.sol#L148) `encode(Account account)`

encode Encodes an account struct with packed ABI encoding.

### Parameters

- `account` Account struct to encode.

### Returns

- `bytes encodedAccount`

## [🔗](contracts/lib/AccountLib.sol#L164) `decode(bytes data)`

decode Decodes an account that was encoded with packed ABI.

### Parameters

- `data` Encoded account struct.

### Returns

- `Account account`

## [🔗](contracts/lib/AccountLib.sol#L203) `encodeExtraPacked(undefined signers)`

encodeExtraPacked Tightly encodes an array of addresses.

abi.encodePacked doesn't remove padding on dynamic array values

### Parameters

- `signers` Array to pack.

### Returns

- `bytes packedSigners`
