# Fraud Proofs

This document defines the fraud proofs used to audit block execution on the chain peg contract. While these are referred to abstractly as "fraud proofs" they are really error proofs, as they do not inherently indicate intent to defraud and could be the result of processing errors. As such, we use the term fraud proofs generally in keeping with common practice, but individual proofs are referred to as error proofs.

# Error Utilities

A number of utility functions are defined to simplify code which is regularly reused in the other libraries.

## Verify Account In State

Verifies that an encoded state proof is a valid merkle proof of an account's inclusion in the provided state root and returns the account struct, the index of the account in the tree, the merkle proof (which is used for updates, where necessary) and whether the account was empty.

**Inputs**

- `stateRoot` - Root hash of the state tree.
- `stateProof` - Encoded `StateProof` struct.

**Process**

1. Decodes `stateProof` as a `StateProof` struct with fields `(bytes data, uint256 accountIndex, bytes32[] siblings)`
2. Verifies the merkle proof with `verifyMerkleProof(stateRoot, data, accountIndex, siblings)`
3. Decodes `data` as an account
   - If `data` is a null buffer of 32 bytes, creates a default account struct and sets a boolean `empty` to true
   - Otherwise, decodes it as an account struct
4. Returns `(empty, accountIndex, siblings, account)`

## Transaction Had Previous State

Verifies the state root prior to a transaction.

**Inputs**

- `previousRootProof` - ABI encoded form of either a block header or a transaction inclusion proof
- `blockHeader` - Block header of the block with the original transaction
- `transactionIndex` - Index of the original transaction

**Process**

1. If `transactionIndex == 0`, decodes `previousRootProof` as a block header and verifies that its block number is one less than `blockHeader` and that it exists in the set of submitted blocks, then returns `blockHeader.stateRoot`.

2. Otherwise, decodes `previousRootProof` as `(bytes, bytes32[])` and verifies it as a transaction inclusion proof in `blockHeader.transactionsRoot` using `transactionIndex - 1` as the index, then returns the last 32 bytes of the decoded `bytes` as the previous state root.

## Verify Previous Account State

Verifies the state of an account in the state root prior to a transaction.

**Inputs**

- `badHeader` - Header of the block with the original transaction
- `transactionIndex` - Index of the original transaction
- `previousRootProof` - ABI encoded form of either a block header or a transaction inclusion proof
- `stateProof` - Merkle proof of the account in the previous state root.

**Process**

1. Verify the previous state proof using `transactionHadPreviousState(previousStateProof, badHeader, transactionIndex)` and sets the result as `previousRoot`.
2. Return the result of `verifyAccountInState(previousRoot, stateProof)`

## Validate Transaction State Proof

Decodes and validates a TransactionStateProof, which contains an inclusion proof for a transaction and the state root prior to its execution.

**Inputs**

- `header` - Header of the block with the original transaction
- `proofBytes` - encoded `TransactionStateProof` which has fields `(uint256 transactionIndex, bytes32[] siblings, bytes previousRootProof)`
- `transactionBytes` - encoded transaction to verify inclusion proof of

> Note: This struct is used because of some issues we ran into with ABIEncoderV2 when the params were provided as calldata.

**Process**

1. Decode `proofBytes` as `(uint256 transactionIndex, bytes32[] siblings, bytes previousRootProof)`
2. Verify that `header` is a pending block
3. Verify the merkle proof using `verifyMerkeProof(header.transactionsRoot, transactionBytes, trasactionIndex, siblings)`
4. Return the result of `transactionHadPreviousState(previousRootProof, header, transactionIndex)`

# Block Errors

Block error proofs are used to demonstrate that either the transactions buffer or the block header in a block were invalid in some way.

## State Root Error

Proves that a block had an invalid `stateRoot` field by proving that it does not match the `intermediateStateRoot` of its last transaction.

**Inputs**

- `header` - Header of the block
- `transactionsData` - Transactions buffer from the block

**Process**

1. Verify that the `header` is a pending block
2. Verify that `header.transactionsHash == keccak256(transactionsData)`
3. Take the last 32 bytes of `transactionsData` as `expectedRoot`
4. If `expectedRoot != header.stateRoot` revert the block.

## State Size Error

Proves that a block had an invalid `stateSize` field by proving that it does not correctly increment the previous block's `stateSize`

**Inputs**

- `parent` - Header of the previous block
- `header` - Header of the block
- `transactionsData` - Transactions buffer from the block

**Process**

1. Verify that the `header` is a pending block
2. Verify that `header.blockNumber == parent.blockNumber + 1`
3. Verify that `parent` is a block that has been recorded, either pending or confirmed
4. Decode `TransactionsMetadata` from the first 16 bytes of `transactionsData`
5. Sum `meta.hardCreateCount` and `meta.softCreateCount` as `totalCreates`
6. If `parent.stateSize + totalCreates != header.stateSize` revert the block.

## Hard Transactions Count Error

Proves that the `hardTransactionsCount` in the block header is not equal to the total number of hard transactions in the metadata plus the previous block's hard transactions count.

**Inputs**

- `parent` - Header of the previous block
- `header` - Header of the block
- `transactionsData` - Transactions buffer from the block

**Process**

1. Verify that the `header` is a pending block
2. Verify that `header.blockNumber == parent.blockNumber + 1`
3. Verify that `parent` is a block that has been recorded, either pending or confirmed
4. Verify that `header.transactionsHash == keccak256(transactionsData)`
5. Decode `TransactionsMetadata` from the first 16 bytes of `transactionsData`
6. Set `meta.hardCreateCount + meta.hardDepositCount + meta.hardWithdrawCount + meta.hardAddSignerCount` to `totalHardTransactions`
7. If `parent.hardTransactionsCount + totalHardTransactions != header.hardTransactionsCount` revert the block.

## Hard Transactions Range Error

Proves that a block has a missing or duplicate hard transaction index.

**Inputs**

- `parent` - Header of the previous block
- `header` - Header of the block
- `transactionsData` - Transactions buffer from the block

**Process**

1. Verify that the `header` is a pending block
2. Verify that `header.blockNumber == parent.blockNumber + 1`
3. Verify that `parent` is a block that has been recorded, either pending or confirmed
4. Verify that `header.transactionsHash == keccak256(transactionsData)`
5. Decode `TransactionsMetadata` from the first 16 bytes of `transactionsData`
6. Calculate `totalHardTransactions` as:

```
(
  meta.hardCreateCount + meta.hardDepositCount +
  meta.hardWithdrawCount + meta.hardAddSignerCount
)
```

7. Set `previousTotal` to `parent.hardTransactionsCount`
8. Set `fraudProven = false`
9. Create variable `bytes buffer = new bytes(totalHardTransactions)`
10. Set `txPtr` to the memory location of `transactionsData` plus 48 (to skip the length field that Solidity sets and the metadata)
11. Set `bufferPtr` to the memory location of `buffer` plus 32 (to skip the length field that Solidity sets)
12. Loop through each hard transaction type:
13. If `fraudProven`, skip
14. Set `length` to the appropriate length field for the transaction type in the metadata
15. Loop from `0` to `length`
    1. Read `hardTransactionIndex` from the first 5 bytes after `txPtr`
    2. Set `relativeIndex = hardTransactionIndex - previousTotal`
    3. Read a single byte from `bufferPtr + relativeIndex`
    4. If the byte is not zero, set `fraudProven = true` and break the loop
    5. Set the byte to 1
    6. Increment `txPtr` by the length of the transaction type
16. If `fraudProven == true` revert the block.

## Hard Transactions Order Error

Proves that a block has a hard transaction which is out of order.

**Inputs**

- `header` - Header of the block
- `transactionsData` - Transactions buffer from the block

**Process**

1. Verify that the `header` is a pending block
2. Verify that `header.transactionsHash == keccak256(transactionsData)`
3. Decode `TransactionsMetadata` from the first 16 bytes of `transactionsData`
4. Set `fraudProven = false`
5. Set `txPtr` to the memory location of `transactionsData` plus 48 (to skip the length field that Solidity sets and the metadata)
6. Loop through each hard transaction type:
   1. If `fraudProven`, skip
   2. Set `length` to the appropriate length field for the transaction type in the metadata
   3. Set `last = 0`
   4. Loop from `0` to `length`:
      1. Read `hardTransactionIndex` from the first 5 bytes after `txPtr`
      2. If `(hardTransactionIndex <= last)` set `fraudProven = true` and break the loop
      3. Set `last = hardTransactionIndex`
      4. Increment `txPtr` by the length of the transaction type
7. If `fraudProven == true` revert the block.

## Transactions Root Error

## Transactions Data Length Error

Proves that the length of the transactions data in a block is invalid. "invalid" means that it either did not contain the transaction metadata or that the length is not consistent with the length expected from the metadata.

**Inputs**

- `header` - Header of the block
- `transactionsData` - Transactions buffer from the block

**Process**

1. Verify that the `header` is a pending block
2. Verify that `header.transactionsHash == keccak256(transactionsData)`
3. If `transactionsData.length < 16` revert the block and cease execution.
4. Decode `TransactionsMetadata` from the first 16 bytes of `transactionsData`
5. Calculate `expectedLength` as:

```js
16 +
  (meta.hardCreateCount * 88 +
    meta.hardDepositCount * 48 +
    meta.hardWithdrawCount * 68 +
    meta.hardAddSignerCount * 61 +
    meta.softWithdrawCount * 131 +
    meta.softCreateCount * 155 +
    meta.softTransferCount * 115 +
    meta.softChangeSignerCount * 125);
```

6. If `transactionsData.length != expectedLength` revert the block.

# Transaction Errors

Transaction errors are used to prove that a hard transaction does not match its source or that a soft transaction has an invalid signature.

## Hard Transaction Source Error

Proves that a hard transaction in a block does not match the original hard transaction recorded on mainnet.

**Input**

- `header` - header of the block with the error
- `transaction` - encoded transaction
- `transactionIndex` - index of the transaction
- `siblings` - merkle proof of the transaction
- `previousRootProof` (optional) - ABI encoded proof of the previous state root for the transaction, only used for `HardAddSigner` and `HardDeposit` types
- `stateProof` (optional) - encoded `StateProof`, only used for `HardAddSigner` and `HardDeposit` types

**Process**

1. Verify that the `header` is a pending block
2. Read the first byte from `transaction` as `prefix`
3. Verify that `prefix < 4`
4. Verify that the merkle proof is valid with `verifyMerkleProof(header.transactionsRoot, transaction, transactionIndex, siblings)`
5. Read `hardTransactionIndex` from bytes 1-6 in `transaction`
6. Retrieve the original hard transaction from the recorded hard transactions on the peg contract as `originalTransaction`
7. Use the appropriate function listed below to handle the rest of the verification. The function will return a boolean for whether an error was found.
8. If the result is true, revert the block.

### Hard Create

**Input**

- `inputData` - original hard transaction from the peg contract
- `outputData` - actual hard transaction in the block

**Process**

1. If `outputData.length != 89` or the first byte of `inputData` is not `0`, return `true`
2. Decode `inputData` as an input hard deposit, with fields `(address contractAddress, address signerAddress, uint56 value)` and set it to `input`
3. Decode `outputData` as an output hard create with fields `uint40 hardTransactionIndex, uint32 accountIndex, uint56 value, address contractAddress, address signerAddress, bytes32 intermediateStateRoot` and set it to `output`
4. If any of the following checks fail, return `true`:
   1. `output.contractAddress == input.contractAddress`
   2. `output.signerAddress == input.signerAddress`
   3. `output.value == input.value`

### Hard Deposit

**Input**

- `header` - block header with the transaction
- `inputData` - original hard transaction from the peg contract
- `outputData` - actual hard transaction in the block
- `transactionIndex` - index of the transaction
- `previousRootProof` (optional) - ABI encoded proof of the previous state root for the transaction
- `stateProof` (optional) - encoded `StateProof`

**Process**

1. If `outputData.length != 49` or the first byte of `inputData` is not equal to `0`, return `true`
2. Decode `inputData` as an input hard deposit, with fields `(address contractAddress, address signerAddress, uint56 value)` and set it to `input`
3. Decode `outputData` as an output hard deposit with fields `uint40 hardTransactionIndex, uint32 accountIndex, uint56 value, bytes32 intermediateStateRoot` and set it to `output`
4. If `input.value != output.value` return `true`
5. Set `previousRoot` to the result of calling `transactionHadPreviousState(previousRootProof, header, transactionIndex)`
6. Get the return values `accountIndex, account` from the result of `verifyAccountInState(previousRoot, stateProof)`
7. Set `indexMatch` to `output.accountIndex == accountIndex`
8. Set `addressMatch` to `account.contractAddress == input.contractAddress`
9. If `indexMatch` is true and `addressMatch` is false, or `indexMatch` is false and `addressMatch` is true, the caller has proved that the deposit was given to the wrong account. Return `true`.
10. Otherwise return false.

### Hard Withdrawal

**Input**

- `inputData` - original hard transaction from the peg contract
- `outputData` - actual hard transaction in the block

**Process**

1. If `outputData.length != 49` or the first byte of `inputData` is not `2` return true.
2. Decode `inputData` as an input hard withdrawal, with fields `(uint32 accountIndex, address caller, uint56 value)` and set it to `input`
3. Decode `outputData` as an output hard withdrawal with fields `uint40 hardTransactionIndex, uint32 accountIndex, address withdrawalAddress, uint56 value, bytes32 intermediateStateRoot` and set it to `output`
4. If any of the following checks fail, return `true`:
   1. input.accountIndex == output.accountIndex
   2. input.value == output.value
   3. input.caller == output.withdrawalAddress
5. Otherwise return `false`

### Hard Add Signer

**Inputs**

- `header` - block header with the transaction
- `inputData` - original hard transaction from the peg contract
- `outputData` - actual hard transaction in the block
- `transactionIndex` - index of the transaction
- `previousRootProof` (optional) - ABI encoded proof of the previous state root for the transaction
- `stateProof` (optional) - encoded `StateProof`

**Process**

1. If `outputData.length != 94` or the first byte of `inputData` is not equal to `3`, return `true`
2. Decode `inputData` as an input hard add signer with fields `(uint32 accountIndex, address caller, address signingAddress)`
3. Decode `outputData` as an output hard add signer with fields `(uint40 hardTransactionIndex, uint32 accountIndex, address signingAddress, bytes32 intermediateStateRoot)`
4. If `input.accountIndex != output.accountIndex` or `input.signingAddress != output.signingAddress` are true, return `true`
5. Set `previousRoot` to the result of calling `transactionHadPreviousState(previousRootProof, header, transactionIndex)`
6. Get the return values `accountIndex, account` from the result of `verifyAccountInState(previousRoot, stateProof)`
7. If `accountIndex != input.accountIndex` revert the transaction.
8. If `output.intermediateStateRoot != previousRoot` and `input.caller != account.contractAddress` return `true`
9. Otherwise return `false`

## Signature Error

Proves that a transaction had an invalid signature or a signature from an account not in the signers array.

**Input**

- `header` - header of the block with the bad transaction
- `transaction` - transaction with the bad signature
- `transactionIndex` - index of the transaction
- `siblings` - merkle proof of the transaction
- `previousRootProof` - encoded `TransactionProof`
- `stateProof` - encoded `StateProof`

**Process**

1. Verify that the `header` is a pending block
2. Read the first byte from `transaction` as `prefix`
3. Verify that `prefix > 3`
4. Verify that the merkle proof is valid with `verifyMerkleProof(header.transactionsRoot, transaction, transactionIndex, siblings)`
5. Get the signer address by calling `recoverSignature(transaction)`
6. If the address is equal to zero, it had an invalid signature, revert the block and stop execution.
7. Get `previousRoot` by calling `transactionHadPreviousState(previousRootProof, header, transactionIndex)`
8. Get `(accountIndex, account)` from `verifyAccountInState(previousRoot, stateProof)`
9. Get the transaction's account index from bytes 4-8
10. Verify that the transaction's account index is equal to `accountIndex`, otherwise revert
11. Check if `account.signers` contains the signer address from step 5.
12. If it does not, revert the block.

# Execution Errors

Execution errors are used to prove that a transaction was executed incorrectly, either because the state of the chain prior to the transaction does not allow the transaction to be executed, or because one or more output fields in the transaction are invalid.

## Create Index Error

Proves that a create transaction assigned an invalid account index to the new account.

**Input**

- `parent` - header of the previous block
- `header` - header of the block with the error
- `transactionsData` - transaction buffer from the block
- `transactionsIndex` - index of the transaction with the bad account index

**Process**

1. Verify that `header` is a pending block and that `parent` is a pending or confirmed block with a block number one less than `header`'s
2. Decode the transactions metadata from `transactionsData` as `meta`
3. If `transactionsIndex` is less than `meta.hardCreatesCount`:
   1. Get the pointer to the beginning of the transaction as `transactionsData+48 + 88 * (meta.hardCreatesCount - transactionIndex)`
   2. Read the account index from the buffer as the first 4 bytes after `pointer + 5`
   3. If the account index is not equal to `parent.stateSize + (meta.hardCreatesCount - transactionIndex)` revert the block
4. Otherwise:
   1. Calculate the sum of previous transaction counts as `priorSum` for the set of hard transactions and soft withdrawals.
   2. Calculate the pointer by adding `transactionsData+48` to the sum of products of the count for each of aforementioned transaction types by its respective size.
   3. Get the number of previously executed soft creates as `(meta.softCreatesCount - (transactionIndex - priorSum))` and sum it with `meta.hardCreatesCount` and `parent.stateSize`. Set this to `expectedIndex`
   4. Read the account index as the first 3 bytes after `pointer + 3`
   5. If `expectedIndex != accountIndex` revert the block

## Execution Error

**Input**

- `header` - header of the block with the error
- `transactionProof` - encoded `TransactionStateProof`
- `transaction` - encoded transaction with the error
- `stateProof1` - encoded `StateProof`
- `stateProof2` (optional) - encoded `StateProof`

**Process**

1. Get `previousRoot` as the result of calling `validateTransactionStateProof(header, transactionProof, transaction)`
2. Read the transaction prefix from the first byte.
3. Use the prefix to decode `transaction` as the appropriate type and call the appropriate function listed below.
4. If the call does not cause the transaction to revert, revert the block.

### Hard Create

Prove any of the following:

- the transaction was not executed
- an account already existed in the state with the transaction's contract address
- the account created was not empty before the transaction
- the output state root does not match the expected result of applying the state transition

**Input**

- `previousRoot` - root hash of the state tree prior to the transaction
- `stateProof` - encoded `StateProof`
- `transaction` - `HardCreate` struct

**Process**

1. Get the return values `(empty, accountIndex, siblings, provenAccount)` from `verifyAccountInState(previousRoot, stateProof)`
2. Hard creates can not be rejected, so if `transaction.intermediateStateRoot == previousRoot`, return
3. If the proven account index is not equal to the transaction's account index:
   1. Verify that the proven account has a contract address equal to the transaction's.
   2. If it does, return true, otherwise revert the transaction.
4. If the proven account is not empty, return
5. Create a new account with `balance = transaction.value, signers = [transaction.signerAddress], contractAddress = transaction.contractAddress`
6. Calculate the new state root with `updateAccount(newAccount, accountIndex, siblings)`
7. Return the transaction if the new state root is equal to the transaction's intermediate state root.

### Hard Deposit

Prove any of the following:

- the transaction was not executed
- the output state root does not match the expected result of applying the state transition

**Input**

- `previousRoot` - root hash of the state tree prior to the transaction
- `stateProof` - encoded `StateProof`
- `transaction` - `HardDeposit` struct

**Process**

1. Get the return values `(empty, accountIndex, siblings, account)` from `verifyAccountInState(previousRoot, stateProof)`
2. Hard deposits can not be rejected, so if `transaction.intermediateStateRoot == previousRoot`, return
3. Verify that `transaction.accountIndex == accountIndex` (revert the transaction otherwise)
4. Increase `account.balance` by `transaction.value`
5. Recalculate the state root with `updateAccount(account, accountIndex, siblings)`
6. Revert the transaction if the new state root is equal to the transaction's intermediate state root.

### Hard Withdrawal

Prove any of the following:

- the transaction was rejected and should not have been
- the transaction was not rejected and should have been
- the output state root does not match the expected result of applying the state transition

**Input**

- `previousRoot` - root hash of the state tree prior to the transaction
- `stateProof` - encoded `StateProof`
- `transaction` - `HardWithdrawal` struct

**Process**

1. Get the return values `(empty, accountIndex, siblings, account)` from `verifyAccountInState(previousRoot, stateProof)`
2. Verify that `accountIndex == transaction.accountIndex`, revert the transaction otherwise
3. Set `rejected` to `transaction.intermediateStateRoot == previousRoot`
4. Set `shouldReject=true` if any of the following are true:
   1. `empty == true`
   2. `account.balance < transaction.value`
   3. `transaction.withdrawalAddress != account.contractAddress` (withdrawal address is set to the caller address from when the transaction was recorded)
5. If `shouldReject != rejected` return
6. If `rejected` is true, revert the transaction
7. Subtract `transaction.value` from `account.balance`
8. Recalculate the state root with with `updateAccount(account, accountIndex, siblings)`
9. Revert the transaction if the new state root is equal to the transaction's intermediate state root.

### Hard Add Signer

Prove any of the following:

- the transaction was rejected and should not have been
- the transaction was not rejected and should have been
- the output state root does not match the expected result of applying the state transition

**Input**

- `previousRoot` - root hash of the state tree prior to the transaction
- `stateProof` - encoded `StateProof`
- `transaction` - `HardAddSigner` struct

**Process**

1. Get the return values `(empty, accountIndex, siblings, account)` from `verifyAccountInState(previousRoot, stateProof)`
2. Verify that `accountIndex == transaction.accountIndex`, revert the transaction otherwise
3. Set `rejected` to `transaction.intermediateStateRoot == previousRoot`
4. Set `shouldReject = true` if any of the following are true:
   1. `empty == true`
   2. `account.signers.length == 10`
   3. `hasSigner(account, transaction.signerAddress) == true`
5. If `shouldReject != rejected` return
6. If `rejected` is true, revert the transaction.
7. Call `addSigner(account, transaction, signerAddress)`
8. Recalculate the state root with with `updateAccount(account, accountIndex, siblings)`
9. Revert the transaction if the new state root is equal to the transaction's intermediate state root.

### Soft Withdrawal

Prove any of the following:

- the transaction was included despite having invalid preconditions
  - the transaction nonce was not equal to the account's nonce
  - the account had an insufficient balance
- the output state root does not match the expected result of applying the state transition

**Input**

- `previousRoot` - root hash of the state tree prior to the transaction
- `stateProof` - encoded `StateProof`
- `transaction` - `SoftWithdrawal` struct

**Process**

1. Get the return values `(empty, accountIndex, siblings, account)` from `verifyAccountInState(previousRoot, stateProof)`
2. Verify that `accountIndex == transaction.accountIndex`, revert the transaction otherwise
3. If either of the following are true, return:
   1. `account.balance < transaction.value`
   2. `account.nonce != transaction.nonce`
4. Set `account.nonce += 1`
5. Set `account.balance -= transaction.value`
6. Recalculate the state root with with `updateAccount(account, accountIndex, siblings)`
7. Revert the transaction if the new state root is equal to the transaction's intermediate state root.

### Soft Create

Prove any of the following:

- the transaction was included despite having invalid preconditions
  - the sender had an insufficient balance
  - the transaction nonce did not match the sender's nonce
  - the contract address for the new account already existed in the state
- the output state root does not match the expected result of applying the state transition

**Input**

- `previousRoot` - root hash of the state tree prior to the transaction
- `senderProof` - encoded `StateProof`
- `receiverProof` - encoded `StateProof`
- `transaction` - `SoftCreate` struct

**Process**

1. Get the return values `(senderIndex, senderSiblings, sender)` from `verifyAccountInState(previousRoot, senderProof)`
2. Verify `senderIndex == transaction.fromIndex`, revert otherwise
3. If either of the following are true, return:
   1. `sender.nonce != transaction.nonce`
   2. `sender.value < transaction.value`
4. Set `sender.balance -= transaction.value`
5. Set `sender.nonce += 1`
6. Recalculate the state root with `updateAccount(sender, senderIndex, senderSiblings)` and set it to `intermediateRoot`
7. Get the return values `(receiverEmpty, receiverIndex, receiverSiblings, receiver)` from `verifyAccountInState(intermediateRoot, receiverProof)`
8. If `receiverIndex != transaction.toIndex`:
   1. Verify that `receiver.contractAddress == transaction.contractAddress`
   2. If true, return
   3. If false, revert the transaction
9. If `receiverEmpty` is false, return
10. Create a new account with `balance = transaction.value, signers = [transaction.signerAddress], contractAddress = transaction.contractAddress`
11. Recalculate the state root with `updateAccount(receiver, receiverIndex, receiverSiblings)`
12. If the new root is equal to the transaction's intermediate state root, revert the transaction.

### Soft Deposit

Prove any of the following:

- the transaction was included despite having invalid preconditions
  - the sender had an insufficient balance
  - the transaction nonce did not match the sender's nonce
- the output state root does not match the expected result of applying the state transition

**Input**

- `previousRoot` - root hash of the state tree prior to the transaction
- `senderProof` - encoded `StateProof`
- `receiverProof` - encoded `StateProof`
- `transaction` - `SoftTransfer` struct

**Process**

1. Get the return values `(senderIndex, senderSiblings, sender)` from `verifyAccountInState(previousRoot, senderProof)`
2. Verify `senderIndex == transaction.fromIndex`, revert otherwise
3. If either of the following are true, return:
   1. `sender.nonce != transaction.nonce`
   2. `sender.value < transaction.value`
4. Set `sender.balance -= transaction.value`
5. Set `sender.nonce += 1`
6. Recalculate the state root with `updateAccount(sender, senderIndex, senderSiblings)` and set it to `intermediateRoot`
7. Get the return values `(receiverIndex, receiverSiblings, receiver)` from `verifyAccountInState(intermediateRoot, receiverProof)`
8. Verify that `receiverIndex == transaction.toIndex`, otherwise revert the transaction.
9. Set `receiver.balance += transaction.value`
10. Recalculate the state root with `updateAccount(receiver, receiverIndex, receiverSiblings)`
11. If the new root is equal to the transaction's intermediate state root, revert the transaction.

### Soft Change Signer

Prove any of the following:

- the transaction was included despite having invalid preconditions
  - the transaction nonce was not equal to the account's nonce
  - the transaction tried to remove a signer not in the account
  - the transaction tried to add a signer already in the account
  - the transaction tried to add a signer when the signers array was full
- the output state root does not match the expected result of applying the state transition

**Input**

- `previousRoot` - root hash of the state tree prior to the transaction
- `stateProof` - encoded `StateProof`
- `transaction` - `SoftChangeSigner` struct

**Process**

1. Get the return values `(accountIndex, siblings, account)` from `verifyAccountInState(previousRoot, stateProof)`
2. Verify that `accountIndex == transaction.accountIndex`, revert the transaction otherwise
3. If `transaction.nonce != account.nonce`, return
4. If `transaction.modificationCategory == 0` it is an add signer transaction:
   1. If the account already had the signer address, return.
   2. If the account's signers array was full (10 members), return.
   3. Add `transaction.signerAddress` to `account.signers`
5. Otherwise it was a remove signer transaction:
   1. If the account did not have the signer address, return.
   2. Remove the signer address from `account.signers`
6. Set `account.nonce += 1`
7. Recalculate the state root with `updateAccount(account, accountIndex, siblings)`
8. If the new root is equal to the transaction's intermediate state root, revert the transaction.
