## `AccountLib`

### `newAccount(address contractAddress, address signerAddress, uint56 balance) → struct AccountLib.Account` (internal)

newAccount
Creates a new account struct with the provided inputs.

### `updateAccount(struct AccountLib.Account account, uint256 accountIndex, bytes32[] siblings) → bytes32 updatedRoot` (internal)

updateAccount
Updates the leaf node in the state tree with the modified account
structure.

### `verifyAccountInState(bytes32 stateRoot, bytes encoded) → bool empty, uint256 accountIndex, bytes32[] siblings, struct AccountLib.Account account` (internal)

The proof is ABI encoded because of errors I ran into with ABIEncoderV2.
If the account does not exist (because the leaf at the index is null),
but a valid merkle proof is provided, this will return `empty=true` along with
a default account struct.

verifyAccountInState
Verifies that an account exists in the provided state root and returns
the account struct, the index of the account in the tree, the merkle proof
(which is used for updates, where necessary) and whether the account was empty.

### `hasSigner(struct AccountLib.Account account, address signer) → bool` (internal)

hasSigner
Returns a boolean stating whether `signer` is in the `signers`
array of `account`.

### `addSigner(struct AccountLib.Account account, address signer)` (internal)

addSigner
Adds an address to the account's array of signers.

### `removeSigner(struct AccountLib.Account account, address signer)` (internal)

This function creates a new array and reassigns the `signers`
field in the account struct, because Solidity does not allow resizing
arrays.

addSigner
Removes an address from the account's array of signers.

### `encode(struct AccountLib.Account account) → bytes encodedAccount` (internal)

encode
Encodes an account struct with packed ABI encoding.

### `decode(bytes data) → struct AccountLib.Account account` (internal)

decode
Decodes an account that was encoded with packed ABI.

### `encodeExtraPacked(address[] signers) → bytes packedSigners` (internal)

abi.encodePacked doesn't remove padding on dynamic array values

encodeExtraPacked
Tightly encodes an array of addresses.
