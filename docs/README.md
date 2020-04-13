# Dharma L2 - Initial Spec

_Authors: @_**0age** _& @_**d1ll0n**

Scaling out Dharma's user base will require a transition of the Dharma Dai token to "Layer 2". This spec outlines an initial implementation using Optimistic Rollup. It endeavors to remain as simple as possible while still affording important security guarantees and significant efficiency improvements. It is designed to fill the current application requirements of scalable token transfers, with the expectation that we will eventually move to a more mature, generic L2 as production-ready platforms come online.

## Table of Contents
- [Overview](#overview)
- [State](#state)
- [Transactions](#transactions)
  - [Deposits](#deposits)
  - [Transfers](#transfers)
  - [Withdrawals](#withdrawals)
  - [Signer Modification](#signer-modification)
- [Block Production](#block-production)
- [Fraud Proofs](#fraud-proofs)
  - [Verification Functions](#verification-functions)
  - [Block Header Fraud Proofs](#block-header-fraud-proofs)
    - [Fraudulent State Size](#fraudulent-state-size)
    - [Fraudulent Transactions Root](#fraudulent-transactions-root)
  - [Hard Transaction Fraud Proofs](#hard-transaction-fraud-proofs)
    - [Fraudulent Hard Transaction Range](#fraudulent-hard-transaction-range)
    - [Fraudulent Hard Transaction Source](#fraudulent-hard-transaction-source)
  - [Execution Fraud Proofs](#execution-fraud-proofs)
    - [Invalid Signature](#invalid-signature)
    - [Duplicate Account Creation](#duplicate-account-creation)
    - [Transaction Execution Fraud](#transaction-execution-fraud)

## Overview
This spec has been designed to meet the following requirements:
- The system must be able to support deposits, transfers, and withdrawals of a single ERC20 token: Dharma Dai.
- All participants must remain in control of their tokens, with any transfer requiring their authorization via a valid signature, <!-- _(or set of signatures)_ --> and with the ability to exit the system of their own volition.
- All participants must be able to locally recreate the current state of the system based on publically available data, and to roll back an invalid state during a challenge period by submitting a proof of an invalid state transition.
- The system should be able to scale out to support a large user base, allowing for faster L2 transactions and reducing gas costs by at least an order of magnitude compared to L1.

In contrast, certain properties are explicitly _not_ required in the initial spec:
- Transactions do not require strong guarantees of censorship resistance _(as long as unprocessed deposits and exits remain uncensorable)_ — Dharma Labs will act as the sole block producer, thereby simplifying many aspects of the system.
- Generic EVM support _(indeed, even support for _any_ functionality beyond token transfers)_ is not required — this greatly simplifies the resultant state, transaction, block production, and fraud proof mechanics.
- Scalability does not need to be maximal, only sufficient to support usage in the near-term under realistic scenarios — we only need to hold out until more efficient data-availability oracles or zero-knowledge circuits and provers become production-ready.

## State
The world state will be represented as a collection of accounts, each designated by a unique 32-bit index _(for a maximum of 4,294,967,296 accounts)_, as well as by a 32-bit `stateSize` value that tracks the total number of accounts. Each account will contain:
- the address of the account _(represented by a 160-bit value)_
- the nonce of the account _(represented by a 24-bit value, capped at 16,777,216 transactions per account)_
- the balance of the account _(represented by a 56-bit value, capped at 720,575,940 dDai per account)_
- an array of unique signing addresses _(represented by concatenated 160 bit addresses, with a maximum of 10 signing addresses per account, in order of assignment)_

<!-- > Note: An eight-bit "threshold" for the account could be included in order to provide more advanced multisig support. -->

The state is represented as a merkle root, composed by constructing a sparse merkle tree with accounts as leaves. Each leaf hash is the hash of `keccak256(address ++ nonce ++ balance ++ signing_addresses)`.

Accounts that have not yet been assigned are represented by `0`, the value of an empty leaf node in the sparse merkle tree.

Accounts are only added, and `stateSize` incremented, when processing deposits or transfers to accounts that were previously empty _(also note that_ `stateSize` _is never decremented)_. The state root will be updated accordingly whenever accounts are added or modified.

## Transactions
Each transaction contains a concise representation of the fields used to apply the given state transaction, as well as the intermediate state root that represents the state right after the transaction has been applied. There are two general classes of transaction: those initiated from the Ethereum mainnet by calling into the contract that mediates interactions with layer two, and those initiated from layer two directly via signature from a signing key on the account.

### Hard Transaction Types
Transactions initiated from mainnet, referred to throughout as "hard" transactions, fall into three general categories:
- `HARD_CREATE`: Deposits to accounts that do not yet exist on layer two
- `HARD_DEPOSIT`: Deposits to accounts that already exist on layer two
- `HARD_WITHDRAW`: Explicit withdrawal requests, or "hard withdrawals"
- `HARD_ADD_SIGNER`: Addition of signer keys to existing layer two accounts

Whenever the mediating contract on mainnet receives a hard transaction request, it will increment a `hardTransasctionIndex` value and associate that index with the supplied transaction. Then, whenever the block producer proposes new blocks that include hard transactions, it must include a set with continuous indexes that starts at the last processed hard transaction index — in other words, the block producer determines the number of hard transactions to process in each block, but specific hard transactions cannot be "skipped".

> Note: while the requirement to process each hard transaction protects against censorship of specific transactions, it does not guard against system-wide censorship — the block producer may refuse to process _any_ hard transactions. Various remediations to this issue include instituting additional block producers, including "dead-man switch" mechanics, or allowing for users to update state directly under highly specific circumstances, but the implementation thereof is currently outside the scope of this spec.

### Soft Transaction Types
In contrast, "soft" transactions are initiated from layer two directly, with their inclusion in blocks at the discretion of the block producer. These include:
- `SOFT_WITHDRAW`: Transfers from an account to the account at index zero, or "soft withdrawals"
- `SOFT_CREATE`: Transfers from one account to another account that does not yet exist on layer two
- `SOFT_TRANSFER`: Transfers between accounts that already exist on layer two
- `SOFT_CHANGE_SIGNER`: Addition or removal of a signing key from an account

Each soft transaction must bear a signature <!-- _(or, in the case of threshold multisig support, a collection of signatures)_ --> that resolves to one of the signing keys on the account initiating the transaction in order to be considered valid. Hard transactions, on the other hand, do not require signatures — the caller on mainnet has already demonstrated control over the relevant account.

### Transaction Merkle Root
The set of transactions for each block is represented as a merkle root, composed by taking each ordered transaction and constructing a standard indexed merkle tree, designating a value for each leaf by taking the particular transcation type _(with the format of each outlined below)_, prefixing with a one-byte type identifier, and deriving the keccak256 hash of the combination. The one-byte prefix for each transaction type is as follows:
- `HARD_CREATE`: `0x00`
- `HARD_DEPOSIT`: `0x01`
- `HARD_WITHDRAW`: `0x02`
- `HARD_ADD_SIGNER`: `0x03`
- `SOFT_WITHDRAW`: `0x04`
- `SOFT_CREATE`: `0x05`
- `SOFT_TRANSFER`: `0x06`
- `SOFT_CHANGE_SIGNER`: `0x07`

Once this information has been committed into a single root hash, it is concatenated with the most recent `hardTransactionIndex`, as well as with `newHardTransactionCount` _(or the total number of hard transactions in the block)_ and hashed once more to arrive at the final transaction root.

### Data Availability Format
Additionally, all transaction data is provided whenever new blocks are produced so that it can be made available for fraud proofs. This data is prefixed with a an eighteen-byte header containing the following information:
- `transactionSerializationVersion` _(16 bits)_
- `newAccountCreationDeposits` _(16 bits)_
- `newDefaultDeposits` _(16 bits)_
- `newHardWithdrawals` _(16 bits)_
- `newHardSignerAdditions` _(16 bits)_
- `newSoftWithdrawals` _(16 bits)_
- `newAccountCreationTransfers` _(16 bits)_
- `newDefaultTransfers` _(16 bits)_
- `newSignerChanges` _(16 bits)_

Each value in the header designates the number of transactions in each batch — this gives an upper limit of 65,536 of each type of transaction per block. Each transaction type has a fixed size depending on the type, and all transaction types end in a 32-byte intermediate state root that is used to determine invalid execution in the respective fraud proof.

> Note: intermediate state roots can optionally be applied to chunks of transactions rather than to each transaction, with the trade-off of increased complexity in the required fraud proof.

Transaction type serialization formats and other details are outlined in each relevant section below.

## Deposits
Upon deposit of Dharma Dai into a dedicated contract on L1, a deposit address _(or, in the case of multisig support, multiple addresses and a threshold)_ will be specified. Next, the `hardTransasctionIndex` is incremented and assigned to the deposit.

The block producer will then reference that index in order to construct a valid transaction that credits an account specified by the depositor with the respective token balance. Therefore, all deposits are "hard" transactions.

> Note: In practice, it is likely that Dharma users will not generally make deposits via L1, and will instead purchase L2 tokens through other means.

### Default Deposits
The default deposit transaction type entails depositing funds to a non-empty account. It contains the following fields:
- `hardTransasctionIndex` _(40 bits)_
- `to: accountIndex` _(32 bits)_
- `value` _(56 bits)_
- `intermediateStateRoot` _(256 bits)_

This gives a serialized default deposit transaction length of 384 bits, or 48 bytes.

### Create Deposits
In addition, there is an "account creation" deposit transaction type that is used when transferring to an account that has never been used before. These transaction types are only valid in cases where both the account in question and its corresponding address do not yet exist, and where the specified `to` index is equal to the current `stateSize` value.

Account creation deposit transaction types extend the default deposit transaction type as follows:
- `hardTransasctionIndex` _(40 bits)_
- `to: accountIndex` _(32 bits)_
- `value` _(56 bits)_
- `toAddress` _(160 bits)_
- `initialSigningKey` _(160 bits)_
- `intermediateStateRoot` _(256 bits)_

This gives a serialized account creation deposit transaction length of 704 bits, or 88 bytes.

### Batch Serialization
Each deposit transaction in the batch is processed before any soft transactions and applied to the state. They must be ordered and processed in sequence, along with any hard withdrawals, by `hardTransasctionIndex`.

## Transfers
In order to transfer tokens between accounts in L2, anyone with a signing key attached to a given account can produce a signature authorizing a transfer to a particular recipient.

The block producer will then use that signature to construct a valid transaction that debits the respective amount from the balance of the signer's account and credits it to the recipient specified by the signer. Note that all transfers are "soft" transactions.

### Default Transfers
The default transfer transaction type entails sending funds between two non-empty accounts. They contains the following fields:
- `from: accountIndex` _(32 bits)_
- `to: accountIndex` _(32 bits)_
- `nonce` _(24 bits)_
- `value` _(56 bits)_
- `signature` _(520 bits)_
- `intermediateStateRoot` _(256 bits)_

This gives a serialized default transfer transaction length of 920 bits, or 115 bytes.

### Create Transfers
In addition, there is an "account creation" transfer transaction type that is used when transferring to an account that has never been used before. These transaction types are only valid in cases where both the account in question and its corresponding address do not yet exist, and where the specified `to` index is equal to the current `stateSize` value.

Account creation transfer transaction types extend the default transfer transaction type as follows:
- `from: accountIndex` _(32 bits)_
- `to: accountIndex` _(32 bits)_
- `nonce` _(24 bits)_
- `value` _(56 bits)_
- `toAddress` _(160 bits)_
- `initialSigningKey` _(160 bits)_
- `signature` _(520 bits)_
- `intermediateStateRoot` _(256 bits)_

This gives a serialized account creation transfer transaction length of 1240 bits, or 155 bytes.

### Batch Serialization
Each transfer transaction in the batch is processed in sequence, after all deposits and withdrawals and before any signature modifications have been processed, and applied to the state. As a simplifying restriction, all account creation transfer transactions must occur before any default transfer transactions in a given block.

## Withdrawals
Withdrawals come in two forms: "soft" withdrawals _(submitted as L2 transactions)_ and "hard" withdrawals _(submitted as L1 transactions)_.

### Soft Withdrawals
Any account can construct a "soft" withdrawal transaction to a designated address on L1 by supplying the following fields:
- `from: accountIndex` _(32 bits)_
- `withdrawalAddress` _(160 bits)_
- `nonce` _(24 bits)_
- `value` _(56 bits)_
- `signature` _(520 bits)_
- `intermediateStateRoot` _(256 bits)_

This gives a serialized soft withdrawal transaction length of 1048 bits, or 131 bytes.

Once a batch of soft withdrawal transactions have been included in a block, a 24-hour challenge period must transpire before a proof can be submitted to the L1 contract to disburse the funds to the specified addresses.

This challenge period is to ensure that any fraudulent block has a sufficient window of time for a challenge to be submitted, proving the fraud and rolling back to the latest good block.

> Note: In practice, Dharma will likely facilitate early exits from L2 withdrawals by serving as a counterparty and settling through other means once sufficient confidence in the accuracy of prior block submissions has been established.

Each withdrawal proof verifies that the associated transactions are present and valid for each withdrawal to process, then updates the respective historical transaction root and corresponding block root to reflect that the withdrawal has been processed. Notably, all other relevant state remains intact, meaning fraud proofs may still be submitted that reference the modified transaction roots.

### Hard Withdrawals
Additionally, users may call into a dedicated contract on L1 to schedule a "hard" withdrawal from an account on L2 if the caller's account has a balance on L2. In doing so, the `hardTransasctionIndex` is incremented and assigned to the withdrawal.

The block producer will then reference that index in order to construct a valid transaction that debits the caller's account on L2 and enables the caller to retrieve the funds once the 24-hour finalization window has elapsed.

The hard withdrawal transaction type contains the following fields:
- `transactionIndex` _(40 bits)_
- `from: accountIndex` _(32 bits)_
- `value` _(56 bits)_
- `intermediateStateRoot` _(256 bits)_

This gives a serialized hard withdrawal transaction length of 384 bits, or 48 bytes.

### Batch Serialization
Each withdrawal transaction in the batch is processed before any transfer or signer modification transactions and applied to the state. Hard withdrawals must be ordered and processed in sequence, along with any deposits, by `hardTransasctionIndex`. Soft withdrawals must be provided after any hard transactions and before any other soft transactions.

## Signer Modification
All soft transactions must be signed by one of the signing keys attached to the originating account. The initial signing key is set during account creation as part of a deposit or transfer — an independent transaction is required in order to add additional keys or remove an extisting key.

### Default Signer Modification
The `SOFT_CHANGE_SIGNER` transaction type is used in order to add or remove signing keys from non-empty accounts using a signature from an existing signing key on that account. They contain the following fields:
- `accountIndex` _(32 bits)_
- `nonce` _(24 bits)_
- `signingAddress` _(160 bits)_
- `modificationCategory` _(8 bits)_
- `signature` _(520 bits)_
- `intermediateStateRoot` _(256 bits)_

This gives a serialized signer modification transaction length of 1000 bits, or 125 bytes.

The `modificationCategory` value will initially have only two possible values: `0x00` for adding a key and `0x01` for removing a key. Keys can only be added if they are not already set on a given account, and are added to the end of the array of signing keys. They can only be removed if the key in question is currently set on the given account, and are "sliced" out of the array.

> Note: If all signing keys are removed from an account, it will no longer be possible to submit soft transactions from that account. Recovering funds from the address in question will require intervention from layer one via a hard withdrawal.

### Hard Signer Addition
The `HARD_ADD_SIGNER` transaction type is used to add signing keys to non-empty accounts using the address of that account on L1. They contain the following fields:
- `hardTransasctionIndex` _(40 bits)_
- `accountIndex` _(32 bits)_
- `signingAddress` _(160 bits)_
- `intermediateStateRoot` _(256 bits)_

This gives a serialized signer addition transaction length of 488 bits, or 61 bytes.

The contract on L1 records a hard signer addition transaction with the following data:
* `caller` _(160 bits)_
* `accountIndex` _(32 bits)_
* `signingAddress` _(160 bits)_

> Note: In the future, the hard transaction data should be stored as a hash rather than the full transaction input.

The hard signer addition transaction adds an address to the array of signing keys, where the signing address is not already present in the array and the array is not at its maximum length. If these requirements are not met, or if the caller that recorded the transaction is not approved to perform this action, the transaction will be rejected. If the transaction is rejected, the `intermediateStateRoot` value will be a 32 byte null buffer.

### Batch Serialization
Each signer modification transaction in the batch is processed in sequence, after all other transactions have been processed, and applied to the state.

## Block Production
Dharma Labs will produce successive blocks via calls from a single, configurable hot key to a dedicated contract on the Ethereum mainnet _(based on the assumption that a less expensive, equally-reliable data availability layer is currently unavailable)_. 

This contract endpoint will take five arguments:
- `uint32 newBlockNumber`: The block number of the new block, which must be one greater than that of the last produced block.
- `uint32 newStateSize`: An updated total count of the number of non-empty accounts, derived by applying the supplied account creation deposits and transfers.
- `bytes32 newStateRoot`: An updated state root derived from the last state root by applying the supplied deposits and transfers.
- `bytes32 transactionsRoot`: The merkle root of all transactions supplied as part of the current block _(including an intermediate state root for each)_.
- `bytes calldata transactions`: The transactions header concatenated with each batch of deposits, withdrawals, and transfers as specified in their respective sections.

The final block header is derived by first calculating `transactionsHash` as the keccak256 hash of `transactions`, then by calculating `newHardTransactionCount` as the result of collecting and summing all deposits and hard withdrawals from the `transactions` header. Finally, the new block hash is stored as `keccak256(newBlockNumber ++ newStateSize ++ newStateRoot ++ newHardTransactionCount ++ transactionsRoot ++ transactionsHash)`.

The block producer must include a "bonded" commitment of 100 Dharma Dai with each block. The block will be finalized, and the commitment returned to the block producer, at the end of the challenge period _(explained below)_ if no successful fraud proof is submitted during said period.

> Note: A bonding commitment of 100 Dharma Dai per block would result in a total commitment of 576,000 Dharma Dai at maximum capacity, i.e. with blocks being committed for every new block on the Ethereum mainnet — this would imply that ~5000 transactions are being processed each minute over the entirety of a 24-hour period. A more realistic total commitment would likely be at least an order of magnitude lower than this maximum.

## Fraud Proofs
Once blocks are submitted, they must undergo a 24-hour "challenge" period before they become finalized. During this period, any block containing an invalid operation can be challenged by any party containing the necessary information by which to prove that the block in question was invalid. In doing so, the state will be rolled back to the point when the fraudulent block was submitte and the proven correction will be applied. Furthermore, the bonded stake provided when submitting the fraudulent block, as well as the stake of each subsequent block, will be siezed, with half irrevocably burned (with the equivalent backing collateral distributed amongst all Dharma Dai holders via an increase in the exchange rate) and half provided to the submitter as a reward.

Various categories of fraud proof cover corresponding types of invalid operations, including:
- Supplying an incorrect value for `newStateSize` that does not accurately increment the prior `stateSize` by the total number of account creation transactions in a block _(Fraudulent State Size)_.
- Supplying transaction data that cannot be decoded into a valid set of transactions, due to an improperly-formatted transaction, an incorrect number of any transaction type, an incorrect number of "hard" transactions, or an invalid transaction merkle root _(Fraudulent Transactions Root)_.
- Supplying a range of hard transactions wherein a transaction has incorrectly specified the number of hard transactions, where a duplicate hard transaction is included, or where a given hard transaction index is not included in the range, i.e. a hard transaction is skipped _(Fraudulent Hard Transaction Range)_.
- Supplying a hard transaction where the transaction is inconsistent with the input fields provided by the submitter to the contract on the Ethereum mainnet, has been submitted previously to L2, or does not exist on L1 _(Fraudulent Hard Transaction Source)_.
- Supplying a transaction with an invalid signature _(Invalid Signature)_.
- Supplying an account creation transaction for an account that already exists in the state _(Duplicate Account Creation)_.
- Supplying an intermediate state root that does not accurately reflect the execution of a given transaction, either default type or account creation type _(Transaction Execution Fraud)_.

> Note: certain simple operations do not need fraud proofs as they can be checked upon block submission. For example, supplying a new block with an incorrect value for `newBlockNumber` that does not accurately increment the prior `blockNumber` by one will revert.

### Overview
Without a scheme where blocks can be proven correct by construction _(such as ZK Snarks)_ it is necessary for the L1 to have contracts capable of auditing L2 block execution in order to keep the L2 chain in a valid state. These contracts do not fully reproduce L2 execution and thus do not explicitly verify blocks as being correct; instead, each fraud proof is capable of making only a determination of whether a particular aspect of a block (and thus the entire block) is definitely fraudulent or not definitely fraudulent.

An individual fraud proof makes certain assumptions about the validity of parts of the block which it is not explicitly auditing. These assumptions are only sound given the availability of other fraud proofs capable of auditing those parts of the block it does not itself validate.

Each fraud proof is designed to perform minimal computation with the least calldata possible to audit a single aspect of a block. This is to ensure that large blocks which would be impossible or extremely expensive to audit on the L1 chain can be presumed secure without arbitrarily restricting their capacity to what the L1 could fully reproduce.

### Definitions
Certain terms are used throughout which are important to clearly define the meaning of to avoid confusion:
- *prove*, *verify*, *assert* are used interchangeably in the following sections to refer to conditional branching where the transaction reverts upon a negative result.
- *check* and *compare* are used for conditional branching where execution does not necessarily halt based on a negative result. When these are used, the result of each condition will be explicitly specified.

---
### Block Header Encoding
Encoding of the block header, i.e. `<BlockHeader>`. Note that each block also has a `transactions` buffer, represented in the header by both `transactionsRoot` and `transactionsHash`.

| Element                  | Size (b)  |
| ------------------------ | --------- |
| **number**               | 4         |
| **stateSize**            | 4         |
| **stateRoot**            | 32        |
| **hardTransactionCount** | 5         |
| **transactionsRoot**     | 32        |
| **transactionsHash**     | 32        |
| **Total Block Header**   | 109       |

### Transaction Encoding

#### Transactions Buffer
Encoding of a transaction in the `block.transactions` buffer.

| Type                   | Size (b)    | Size w/ root (b)  |
| ---------------------- | ----------- | ----------------- |
| **HARD_CREATE**        | 56          | 88                |
| **HARD_DEPOSIT**       | 16          | 48                |
| **HARD_WITHDRAW**      | 16          | 48                |
| **HARD_ADD_SIGNER**    | 61          | 93                |
| **SOFT_WITHDRAW**      | 99          | 131               |
| **SOFT_CREATE**        | 123         | 155               |
| **SOFT_TRANSFER**      | 83          | 115               |
| **SOFT_CHANGE_SIGNER** | 93          | 125               |

#### Leaf Encoding
Encoding of a transaction in the transactions merkle tree.

| Type                   | Prefix   | Size (b)  | Size w/ root and prefix (b) |
| ---------------------- | -------- | --------- | --------------------------- |
| **HARD_CREATE**        | 0x00     | 56        | 89                          |
| **HARD_DEPOSIT**       | 0x01     | 16        | 49                          |
| **HARD_WITHDRAW**      | 0x02     | 16        | 49                          |
| **HARD_ADD_SIGNER**    | 0x03     | 61        | 94                          |
| **SOFT_WITHDRAW**      | 0x04     | 99        | 132                         |
| **SOFT_CREATE**        | 0x05     | 123       | 156                         |
| **SOFT_TRANSFER**      | 0x06     | 83        | 116                         |
| **SOFT_CHANGE_SIGNER** | 0x07     | 93        | 126                         |

---
## Verification Functions
We have several basic functions that will be re-used throughout the fraud proofs. These are used to verify specific assertions being made by a challenger attempting to claim fraud, but do not independently make a positive determination that a block is fraudulent. All verification functions assert correctness of conditional arguments and cause the fraud proof to fail if they do not return a positive result.

### Block Is Pending
```csharp=
blockIsPending(blockHeader) { ... }
```
#### Input
* `blockHeader <BlockHeader>` - The block header being checked for pending status.

#### Description
Proves that the supplied block header is committed and pending.

#### Process
- Calculate the hash of the header as `blockHash`.
- Read `blockHeader.number` and retrieve the committed block hash for that number from the pending blocks mapping.
- Assert that `blockHash` is equal to the retrieved block hash.

---
### Block Is Pending And Has Parent
```csharp=
blockIsPendingAndHasParent(blockHeader, previousBlockHeader)
```
#### Input
* `blockHeader <BlockHeader>` - Block header to check for pending status.
* `previousBlockHeader <BlockHeader>` - Block header prior to `blockHeader`.

#### Description
Verifies that `blockHeader` is a committed pending block and that `previousBlockHeader` is either pending or confirmed and has a block number one less than that of `blockHeader`.

#### Process
- Assert that `blockHeader.number` is equal to `previousBlockHeader.number + 1`.
- Call `blockIsPending(blockHeader)` to assert that `blockHeader` represents a pending committed block.
- Calculate the hash of `previousBlockHeader` as `previousBlockHash` and read the block hash from the mapping of pending blocks at the key `previousBlockHeader.number`.
    - Assert that the block hash retrieved either matches `previousBlockHash` or is null
    - If the block hash matches, return
    - If the block hash is null, retrieve the confirmed block hash for `previousBlockHeader.number`
    - Assert that the retrieved block hash is equal to `previousBlockHash`

---
### Merkleize Transactions Tree
```csharp=
calculateTransactionsRoot(transactionHashes) {...}
```

#### Input
* `transactionHashes <bytes32[]>` - Array of hashes of prefixed transactions

#### Description
Calculates the root hash of a transactions merkle tree.

#### Process
> Process taken from [RollupMerkleUtils.sol in Pigi](https://github.com/karlfloersch/pigi/blob/master/packages/contracts/contracts/RollupMerkleUtils.sol#L51) with modifications.

* Set `nextLevelLength` to the length of `transactionHashes`
* Set `currentLevel` to `0`
* If `nextLevelLength == 1`, return `transactionHashes[0]`
* Initialize a new `byte32` array named `nodes` with length `nextLevelLength + 1`
* Check if `nextLevelLength` is odd:
    *  If it is, set `nodes[nextLevelLength] = 0` and set `nextLeveLength += 1`
*  Loop while `nextLevelLength > 1`
    *  Set `currentLevel += 1`
    *  Calculate the nodes for the current level:
        *  Set `i = 0`
        *  Execute a for loop with condition `i < nextLevelLength / 2`, incrementing `i` by `1` each loop
        *  Set `nodes[i] = sha3(nodes[i*2] ++ nodes[i*2 + 1])`
    *  Set `nextLevelLength = nextLevelLength / 2`
    *  Check if `nextLevelLength` is odd and not equal to 1:
        *  If it is, set `nodes[nextLevelLength] = 0`
        *  Set `nextLevelLength += 1`
*  Return `nodes[0]`

---
### Merkle Tree Has Leaf
```csharp=
verifyMerkleRoot(rootHash, leafNode, leafIndex, siblings) { ... }
```
#### Input
* `rootHash <bytes32>` - The root hash of a merkle tree.
* `leafNode <bytes>` - An arbitrarily encoded leaf node.
* `leafIndex <uint>` - The index of the leaf in the merkle tree.
* `siblings <bytes32[]>` - The neighboring nodes of the leaf going up the merkle tree.

#### Description
Computes a merkle root by hashing together nodes going up the tree and compares it to a supplied root.

#### **Process**
- Assert that the length of `leafNode` is not 32
    - This prevents invalid merkle proofs of nodes higher than the bottom level.
- Set `currentHash` to `keccak256(leafNode)`
- Loop through each `sibling` in `siblings`, set the index to $n$
    - Read the $n^{th}$ bit from the right of `leafIndex` to determine parity
        - If it is zero, set `currentHash` to `keccak256(currentHash ++ sibling)`
        - If it is one, set `currentHash` to `keccak256(sibling ++ currentHash)`
- Return `true` if `currentHash` is equal to `rootHash`, otherwise return false.

---
### Verify and Update Merkle Tree
```csharp=
verifyAndUpdate(rootHash, leafNode, newLeafNode, leafIndex, siblings) 
{...}
```
#### Input
* `rootHash <bytes32>` - The root hash of a merkle tree.
* `leafNode <bytes>` - The leaf node to prove inclusion of.
* `newLeafNode <bytes>` - The leaf node to replace `leafNode` with in the tree.
* `leafIndex <uint>` - The index of the leaf in the merkle tree.
* `siblings <bytes32[]>` - The neighboring nodes of the leaf going up the merkle tree.

#### Description
Verifies the value of a leaf node in a merkle tree at a particular index and calculates a new root for that tree where the leaf node has a different value.

#### Process
- Assert that the length of `leafNode` is not 32
    - This prevents invalid merkle proofs of nodes higher than the bottom level.
- Assert that the length of `newLeafNode` is not 32
    - This prevents invalid merkle proofs of nodes higher than the bottom level.
- Set `currentHash` to `keccak256(leafNode)`
- Set `newHash` to `keccak256(newLeafNode)`
- Loop through each `sibling` in `siblings`, set the index to $n$
    - Read the $n^{th}$ bit from the right of `leafIndex` to determine parity
        - If it is zero
            - set `currentHash` to `keccak256(currentHash ++ sibling)`
            - set `newHash` to `keccak256(newHash ++ sibling)`
        - If it is one
            - set `currentHash` to `keccak256(sibling ++ currentHash)`
            - set `newHash` to `keccak256(sibling ++ newHash)`
- Set return value `valid` to `rootHash == currentHash`
- Set return value `newRoot` to `newHash`

---
### Verify and Push to Merkle Tree
```csharp=
verifyAndPush(
  rootHash, leafValue, leafIndex, siblings
) {...}
```
#### Input
* `rootHash <bytes32>` - The root hash of a merkle tree.
* `leafNode <bytes>` - The leaf node to add to the tree.
* `leafIndex <uint>` - The index of the leaf in the merkle tree.
* `siblings <bytes32[]>` - The neighboring nodes of the leaf going up the merkle tree.

#### Description
Same as `verifyAndUpate`, except that the old value used for the proof is just the default leaf value.

#### Process
Return the value given by calling `verifyAndUpate(rootHash, 0, leafNode, leafIndex, siblings)`.

---

### Transaction Exists in Transactions Tree
```csharp=
rootHasTransaction(transactionsRoot, transaction, transactionIndex, siblings)
{ ... }
```
#### Input
* `transactionsRoot <bytes32>` - The root hash of a transactions merkle tree.
* `transaction <bytes>` - An encoded transaction of any type.
* `transactionIndex <uint>` - The index of the transaction in the merkle tree.
* `siblings <bytes32[]>` - The neighboring nodes of the transactions going up the merkle tree.

#### Description
Proves that a single transaction exists in the supplied transactions root by verifying the supplied merkle proof `(transactionIndex, siblings)`.

#### Process
- Return `verifyMerkleRoot(transactionsRoot, transaction, transactionIndex, siblings)`

---
### Transaction Exists in Transactions Tree
```csharp=
rootHasTransaction(transactionsRoot, transaction, transactionIndex, siblings)
{ ... }
```
#### Input
* `transactionsRoot <bytes32>` - The root hash of a transactions merkle tree.
* `transaction <bytes>` - An encoded transaction of any type.
* `transactionIndex <uint>` - The index of the transaction in the merkle tree.
* `siblings <bytes32[]>` - The neighboring nodes of the transactions going up the merkle tree.

#### Description
Proves that a single transaction exists in the supplied transactions root by verifying the supplied merkle proof `(transactionIndex, siblings)`.


#### Process
- Return `verifyMerkleRoot(transactionsRoot, transaction, transactionIndex, siblings)`

---
### Transaction Had Previous State
```csharp=
provePriorState(bytes previousSource, bytes blockHeader, uint40 transactionIndex) {
  // If `transactionIndex` is zero, `previousSource` must be a block header.
  // Otherwise, it must be a transaction inclusion proof.
  if (transactionIndex == 0) {
    // Verify that `previousSource` is a committed pending or confirmed
    // block header with a block number one less than `blockHeader`.
    assert(blockIsPendingAndHasParent(blockHeader, previousSource))
    
    // `decodeHeaderStateRoot` reads the state root from a header buffer.
    return decodeHeaderStateRoot(previousSource)
  } else {
    // If `transactionIndex` is not zero, `previousSource` is a tuple of
    // (uint8 siblingCount, bytes32[] siblings, bytes transaction).
    // If the transaction index is zero, the previous root must be
    // proven with a block header.
    // Read the first 8 bits of `previousSource` as `siblingCount`
    uint siblingCount = previousSource >> 248;
    // `decodeSiblings` decodes `previousSource` into an array of siblings by
    // reading previousSource.slice(1, siblingCount*32)
    bytes32[siblingCount] siblings = previousSource.slice(1, siblingCount * 32)
    // Read intermediate root from the end of the transaction.
    bytes32 previousRoot = previousSource.slice(-32)
    
    // Read the transactions root 
    bytes transactionData = previousSource.slice(1 + siblingCount * 32)
    assert(verifyMerkleProof(previousRoot, transactionData, transactionIndex, siblings))
  }
}
```

#### Description
The first transaction in a block has a starting state root equal to the ending state of the previous block, and every transaction thereafter has a starting state root equal to the intermediate root of the previous transaction. This function takes a block header and a transaction index which represent the absolute position in the L2 history at which the function will prove the previous state root.

If the provided transaction index is zero, it can determine the previous state root by proving that `previousSource` is a valid, committed header which came immediately before the given `blockHeader` parameter. If the transaction index is not zero, the function will determine whether the provided data is the source of the previous state root by attempting to prove that it existed in the same block at the previous transaction index.

#### Input
* `previousSource <BlockHeader | TransactionProof>` - Data used to prove the state prior to a given transaction.
  - Type union of BlockHeader or TransactionProof
  - TransactionProof is a tuple of (uint8 siblingsCount, bytes32[] siblings, bytes transaction)
      - *siblings* are neighboring nodes in a merkle tree used to verify inclusion of a value against a merkle root
* `blockHeader <BlockHeader>` - The header which contains the transaction whose prior state is being proven.
* `transactionIndex <uint40>` - The index of the transaction whose prior state is being proven.

#### Process
- If `transactionIndex` is zero, `previousSource` must be a block header.
  - Use `blockIsPendingAndHasParent(blockHeader, previousSource)` to assert that the provided block header is committed and came immediately before `blockHeader`
  - Decode `previousSource.stateRoot` by slicing 32 bytes from the buffer starting at byte 8
- Otherwise, `previousSource` must contain a merkle proof of the previous transaction.
  - Read the first 8 bits of previousSource as `siblingsCount`
  - Assert that the length of `previousSource` is not less than the minimum length the proof data could have
    - Siblings count: `1 byte`
    - Siblings array: `(32 * siblingsCount) bytes`
    - Minimum transaction size: `48 bytes` (hard deposit + state root)
    - Total Minimum: `49 + siblingsCount * 32`
  - Decode the siblings array as `siblings` by reading bytes 1 to `siblingsCount * 32`
  - Read the state root as `previousRoot` by slicing from the 32nd to last byte of `previousSource` until the end of the buffer
  - Read the transaction data as `transactionData` by slicing from `1 + siblingsCount * 32` to the 32nd to last byte
  - Verify the provided merkle proof with `rootHasTransaction(blockHeader.transactionsRoot, transactionData, transactionIndex - 1, siblings)`
  - Return `previousRoot`

---

### Account Has Signer
```csharp=
accountHasSigner(account, address) {...}
```

#### Input
* `account` - An encoded account
* `address` - An address to search for in the account

#### Description
Searches an account for a particular address and returns a boolean stating whether the account has it as a signer.

#### Process
* If `address == address(0)`, return `false`
* Set a variable `nextOffset` to `30` (pointer to beginning of first signer address)
* Execute a while loop with condition `(nextOffset < account.length)` to read each signer address in the account
    * Read bytes `(nextOffset...nextOffset+20)` from `account` as `nextSigner`
    * If `signer == nextSigner` break and return `true`
    * Set `nextOffset += 20`
* If the loop finishes, return `false`

---
## Block Header Fraud Proofs
### Fraudulent State Size
```csharp=
proveStateSizeError(previousBlockHeader, blockHeader, transactions) { ... }
```

#### Input
* `previousBlockHeader <BlockHeader>` - The block header prior to the block being challenged.
* `blockHeader <BlockHeader>` - The block header being challenged.
* `transactions <bytes>` - Transactions buffer for the block identified by `header`.

#### Description
This proof will determine that fraud has occurred if the transaction type counts in the prefix of the `transactions` buffer in a block is inconsistent with the difference between the block's `newStateSize` and the state size of the previous block.

This function enforces the assumption of a reliable state size in the block header which is needed for other fraud proofs.

#### Process
##### 1. Verify that the inputs are valid
* Call `blockIsPendingAndHasParent(blockHeader, previousBlockHeader)` to assert that both headers are committed and that `blockHeader` immediately follows `previousBlockHeader`
* Hash the `transactions` buffer and assert that the hash matches `blockHeader.transactionsHash`

##### 2. Check if the state size is valid
- Read `newAccountCreationDeposits` as `createDeposits` from `transactions` at bytes `(2...4)`.
- Read `newAccountCreationTransfers` as `createTransfers` from `transactions` at bytes `(10...12)`.
- Read `previousBlockHeader.newStateSize` as `oldStateSize`.
- Read `blockHeader.newStateSize` as `newStateSize`.
- Compare `(oldStateSize + createDeposits + createTransfers)` to `newStateSize`
    - **If they are not equal, determine that fraud has occurred.**


---
### Fraudulent Transactions Root
```csharp=
proveTransactionsRootError(blockHeader, transactions)
```

#### Input
* `blockHeader <BlockHeader>` - Block header being claimed as fraudulent.
* `transactions <bytes>` - Transactions buffer from the block.

#### Description
This proof handles the case where a block header has an invalid `transactionsRoot` value. The contract for this function will decode the `transactions` buffer, derive the merkle root and compare it to the block header.

This function enforces the assumption of a valid transaction tree, which is required for the other fraud proofs to function.

The following table contains information about the transaction type encoding.

| Meta Variable         | Type                   | Prefix   | size (w/ root) |
| --------------------- | ---------------------- | -------- | ------ |
| **hardCreates**       | **HARD_CREATE**        | 0x00     | 88  |
| **defaultDeposits**   | **HARD_DEPOSIT**       | 0x01     | 48  |
| **hardWithdrawals**   | **HARD_WITHDRAW**      | 0x02     | 48  |
| **hardAddSigners**   | **HARD_ADD_SIGNER**      | 0x03     | 93  |
| **softWithdrawals**   | **SOFT_WITHDRAW**      | 0x04     | 131 |
| **softCreates**       | **SOFT_CREATE**        | 0x05     | 155 |
| **softTransfers**     | **SOFT_TRANSFER**      | 0x06     | 115 |
| **softChangeSigners** | **SOFT_CHANGE_SIGNER** | 0x07     | 125 |

#### Process
##### 1. Verify that the inputs are valid
* Call `blockIsPending(blockHeader)` to assert that `blockHeader` represents a committed pending block
* Hash the `transactions` buffer and assert that the hash matches `blockHeader.transactionsHash`

##### 2. Read the transaction type counts
- Initialize two `uint256` variables as `totalCount` and `totalSize` with values of zero.
- Read `newAccountCreationDeposits` as `hardCreates` from `transactions` at bytes `(2...4)`.
    - Increment `totalCount` by `hardCreates`
    - Increment `totalSize` by `hardCreates * 88`
- Read `newDefaultDeposits` as `defaultDeposits` from `transactions` at bytes `(4...6)`.
    - Increment `totalCount` by `defaultDeposits`
    - Increment `totalSize` by `defaultDeposits * 48`
- Read `newHardWithdrawals` as `hardWithdrawals` from `transactions` at bytes `(6...8)`.
    - Increment `totalCount` by `hardWithdrawals`
    - Increment `totalSize` by `hardWithdrawals * 48`
- Read `newHardAddSigners` as `hardAddSigners` from `transactions` at bytes `(8...10)`.
    - Increment `totalCount` by `hardAddSigners`
    - Increment `totalSize` by `hardAddSigners * 93`
- Read `newSoftWithdrawals` as `softWithdrawals` from `transactions` at bytes `(10...12)`.
    - Increment `totalCount` by `softWithdrawals`
    - Increment `totalSize` by `softWithdrawals * 131`
- Read `newAccountCreationTransfers` as `softCreates` from `transactions` at bytes `(12...14)`.
    - Increment `totalCount` by `softCreates`
    - Increment `totalSize` by `softCreates * 155`
- Read `newDefaultTransfers` as `softTransfers` from `transactions` at bytes `(12...14)`
    - Increment `totalCount` by `softTransfers`
    - Increment `totalSize` by `softTransfers * 115`
- Read `newChangeSigners` as `softChangeSigners` from `transactions` at bytes `(14...16)`
    - Increment `totalCount` by `softChangeSigners`
    - Increment `totalSize` by `softChangeSigners * 125`

##### 3. Check if `transactions` is the right size
- Compare `totalSize` to `transactions.length - 14`
    - **If they do not match, determine fraud has been committed.**
    - Otherwise, continue.

##### 4. Collect the leaf nodes
- Initialize a variable `offset` with value `14` to skip the metadata in the transactions buffer
    - This is the pointer to the next transaction
- Initialize a `leafHashes` variable as a `bytes32[]` with length equal to `totalCount`.
    - We use bytes32 here instead of bytes to skip a step in the merkle root calculation
    - We could derive the merkle root directly as we pull the transactions, but for simplicity this will initially feed into an array and then derive the root
- Initialize a `hashBuffer` variable as a `bytes` with length `136` (maximum total size of a transaction including prefix)
- Initialize a `transactionIndex` variable as a `uint256` with value `0`
- For `t` in types (refer to table in description):
    - Set the first byte in `hashBuffer` to `t.prefix`
    - `t.count` refers to the value of the variable matching the *"meta field"* in the types table
    - For `i` in `(0...t.count)`:
        - Copy the next transaction from `transactions` calldata at bytes `offset` with length `t.size` into `hashBuffer` starting at index `1` in `hashBuffer`
        - Set `leafHashes[transactionIndex++]` to the hash of `hashBuffer`
        - Increment `offset` by `t.size`

##### 5. Derive and compare the merkle root
- Derive the merkle root as `expectedRoot` by calling `calculateTransactionsRoot(leafHashes)` 
- Compare `expectedRoot` to `blockHeader.transactionsRoot`
- **If they do not match, determine that fraud has occurred.**

---
## Hard Transaction Fraud Proofs
---
### Fraudulent Hard Transaction Range
```csharp=2
proveHardTransactionRangeError(previousBlockHeader, blockHeader, transactions)
{ ... }
```

#### **Description**
When a new block is posted, any nodes monitoring the rollup contract can compare the header's `newHardTransactionCount` to the same value in the previous block's header and compare the block's hard transactions to the expected new hard transactions.

This function will determine fraud has occurred if any of the following are true:

- the block has less hard transactions than the difference between the new and previous block's `newHardTransactionCount` fields
- the block contains a duplicate hard transaction index
- the block is missing an index in the expected range (last hard count...new hard count)

#### **Input**
*  `previousBlockHeader <BlockHeader>` - The block header with a number one less than `header`.
*  `blockHeader <BlockHeader>` - The block header being challenged.
*  `transactions <bytes>` - The transactions buffer from `blockHeader`.

#### **Process**
##### 1. Verify that the inputs are valid
- Assert that `previousBlockHeader` and `blockHeader` are for committed pending blocks using `blockIsPending`
- Assert that `blockHeader` has a block number one higher than the block number of `previousBlockHeader`
- Hash `transactions` and assert that the hash is equal to `blockHeader.transactionsHash`

##### 2. Check if the transactions metadata is consistent with the block header
- Read `previousBlockHeader.newHardTransactionCount` as `previousHardTransactionCount`
- Read `blockHeader.newHardTransactionCount` as `newHardTransactionCount`
- Calculate `expectedHardTransactionCount` as the difference between `newHardTransactionCount` and `previousHardTransactionCount`
- Read `newAccountCreationDeposits` from `transactions` at bytes `(2...4)` as `createDepositsCount`
- Read`newDefaultDeposits` from `transactions` at bytes `(4...6)` as `defaultDepositsCount`
- Read `newHardWithdrawals` from `transactions` at bytes `(6...8)` as `hardWithdrawalsCount`
- Read `newHardAddSigners` from `transactions` at bytes `(8...10)` as `hardAddSignersCount`
- Compare `(createDepositsCount + defaultDepositsCount + hardWithdrawalsCount + hardAddSignersCount)` to `expectedHardTransactionCount`
    - **If they do not match, determine fraud has occurred.**
    - Otherwise, continue.

##### 3. Check for duplicate or missing transactions
- Allocate an empty memory buffer with length `expectedHardTransactionCount` bits and set `binaryPointer` as the memory pointer to the beginning of the buffer
    - This will be a bitfield used to search for missing and duplicate transactions
- Set `transactionOffset` to the memory or calldata location of `transactions` plus 14 bytes
    - Sets the offset into `transactions` of the beginning of the transactions data.
- For `i` in the range `(0...createDepositsCount)`:
    - Read the `hardTransactionIndex` of the next create deposit from memory as the buffer starting at `transactionOffset` with length 5 bytes
    - **If `hardTransactionIndex` is greater than `previousHardTransactionCount`, determine that fraud has occurred**
    - Set `relativePointer` as the difference between `previousHardTransactionCount` and `hardTransactionIndex` 
    - Read the bit at `binaryPointer + relativePointer`
        - **If it is set to `1`, determine that fraud has occurred**
        - Otherwise, set the bit to `1`
    - Increment `transactionOffset` by 88 bytes to move the pointer past this deposit
- For `i` in the range `(0...defaultDepositsCount)`:
    - Read the `hardTransactionIndex` of the next default deposit from memory as the buffer starting at `transactionOffset` with length 5 bytes
    - **If `hardTransactionIndex` is greater than `previousHardTransactionCount`, determine that fraud has occurred**
    - Set `relativePointer` as the difference between `previousHardTransactionCount` and `hardTransactionIndex` 
    - Read the bit at `binaryPointer + relativePointer`
        - **If it is set to `1`, determine that fraud has occurred**
        - Otherwise, set the bit to `1`
    - Increment `transactionOffset` by 48 bytes to move the pointer past this deposit
- For `i` in the range `(0...hardWithdrawalsCount)`:
    - Read the `hardTransactionIndex` of the next hard withdrawal from memory as the buffer starting at `transactionOffset` with length 5 bytes
    - **If `hardTransactionIndex` is greater than `previousHardTransactionCount`, determine that fraud has occurred.**
    - Set `relativePointer` as the difference between `previousHardTransactionCount` and `hardTransactionIndex` 
    - Read the bit at `binaryPointer + relativePointer`
        - **If it is set to `1`, determine that fraud has occurred.**
        - Otherwise, set the bit to `1`
    - Increment `transactionOffset` by 48 bytes to move the pointer past this withdrawal
- For `i` in the range `(0...hardAddSignersCount)`:
    - Read the `hardTransactionIndex` of the next hard add signer from memory as the buffer starting at `transactionOffset` with length 5 bytes
    - **If `hardTransactionIndex` is greater than `previousHardTransactionCount`, determine that fraud has occurred.**
    - Set `relativePointer` as the difference between `previousHardTransactionCount` and `hardTransactionIndex` 
    - Read the bit at `binaryPointer + relativePointer`
        - **If it is set to `1`, determine that fraud has occurred.**
        - Otherwise, set the bit to `1`
    - Increment `transactionOffset` by 93 bytes to move the pointer past this transaction
- Check if there are any missing hard transactions
    - Loop through each word of memory (or sub-word for low hard transaction counts / final word) in the bitfield, comparing the value in memory to `1 + 2**(bitLength - 1)` (where `bitLength` is the number of bits being compared in each buffer)
        - **If any of these comparisons return false, determine that fraud has occurred.**

---
### Fraudulent Hard Transaction Source
```csharp=3
proveHardTransactionSourceError(
    blockHeader, transaction, transactionIndex, siblings, stateProof
) { ... }
```
#### Input
* `blockHeader <BlockHeader>` - The block header being challenged.
* `transaction <bytes>` - The transaction being claimed to have a bad source.
    * Transactions in leaf nodes, as this parameter is, are prefixed with a byte specifying the transaction type.
* `transactionIndex <uint40>` - The index of the transaction in the transactions tree.
* `siblings <bytes32[]>` - The merkle siblings of the transaction.
* `stateProof <bytes>` - Additional proof data specific to the type of transaction being proven to have a fraudulent source. If not used, equal to `bytes("")`

#### **Description**
This fraud proof handles the case where a block contains a hard transaction with an invalid source, i.e. a transactionIndex which is inconsistent with the escrow contract.

#### Process

##### 1. Verify that the inputs are valid
- Assert that `blockHeader` is for a pending committed block using `blockIsPending(blockHeader)`
- Assert that the transaction has a valid merkle proof using `rootHasTransaction(blockHeader.transactionsRoot, transaction, transactionIndex, siblings)`

##### 2. Decode the transaction
- Read the first byte of `transaction` as `prefix`
- Assert that prefix is less than `0x04`
    - `0x03` is the maximum value of a hard transaction prefix
- Read `transactionIndex` from `transaction` at bytes `(1...6)`
- Read `accountIndex` from `transaction` at bytes `(6...10)`
- If prefix is not `0x03`, read `value` from `transaction` at bytes `(10...17)`

##### 3. Query the expected transaction
- Query the transaction data using `getHardTransaction(transactionIndex)` and set the result to `expectedTransaction`
    - **If `expectedTransaction` is null, determine that fraud has occurred.**

##### 4. Compare the transactions
- If `prefix` is **0x00**, it is a **HARD_CREATE** transaction
    - The transaction retrieved from the escrow should have fields `(value, address)`
    - Check if `expectedTransaction` has a length of `27` bytes
        - **If it does not, determine that fraud has occurred.**
        - Otherwise, continue.
    - Check `value`
        - Read `expectedValue` from `expectedTransaction` at bytes (0...7)
        - Compare `value` to `expectedValue`
            - **If they do not match, determine that fraud has occurred.**
            - Otherwise, continue
    - Check `address`
        - Read `expectedAddress` from `expectedTransaction` at bytes `(7...27)`
        - Read `address` from `transaction` at bytes `(17...37)`
        - Compare `expectedAddress` to `address`
            - **If they do not match, determine that fraud has occurred.**
            
- If `prefix` is **0x01**, it is a **HARD_DEPOSIT** transaction
    - The transaction retrieved from the escrow should have fields `(value, address)`
    - Check if `expectedTransaction` has a length of `27` bytes.
        - **If it does not, determine that fraud has occurred.**
        - Otherwise, continue.
    - Check `value`
        - Read `expectedValue` from `expectedTransaction` at bytes (0...7)
        - Compare `value` to `expectedValue`
            - **If they do not match, determine that fraud has occurred.**
    - Prove the account at `accountIndex`
        - Assert that `stateProof` is not null.
        - Read `stateRoot` from `transaction` at bytes `(17...49)`
            - We could use the state in the previous transaction, but since this is not a create transaction, if the state has changed since the last transaction that can be proven through execution fraud proofs.
        - Decode `stateProof` as a tuple of `(account, siblingCount, siblings)`
            - Read `account` from `stateProof` at bytes `(0...30)`
            - Read `siblingCount` from `stateProof` at bytes `(30...38)`
            - Read `siblings[siblingCount]` from `stateProof` at bytes `(38...(38 + 32 * siblingCount))`
        - Assert that the provided merkle proof is valid with `stateHasAccount(stateRoot, account, accountIndex, siblings)`
    - Check `address`
        - Read `expectedAddress` from `expectedTransaction` at bytes `(7...27)`
        - Read `address` from `account` at bytes `(0...20)`
        - Compare `expectedAddress` to `address`
            - **If they do not match, determine that fraud has occurred.**
        
- If `prefix` is **0x02**, it is a **HARD_WITHDRAW** transaction
    - The transaction retrieved from the escrow should have fields `(caller, fromIndex, value)`
    - Check if `expectedTransaction` has a length of `31` bytes.
        - **If it does not, determine that fraud has occurred.**
        - Otherwise, continue.
    - Check if `accountIndex` is equal to `fromIndex`
        - Read `fromIndex` from `expectedTransaction` at bytes `(20...24)`
        - Compare `fromIndex` to `accountIndex`
            - **If they do not match, determine that fraud has occurred.**
    - Check if `value` is equal to `expectedTransaction.value`
        - Read `expectedValue` from `expectedTransaction` at bytes `(24...31)`
            - **If they do not match, determine that fraud has occurred.**

- If `prefix` is **0x03**, it is a **HARD_ADD_SIGNER** transaction
    - The transaction retrieved from the escrow should have fields `(caller, accountIndex, signerAddress)`
    - Check if `expectedTransaction` has a length of `44` bytes
        - **If it does not, determine that fraud has occurred.**
        - Otherwise, continue.
    - Check if `accountIndex` is equal to `fromIndex`
        - Read `fromIndex` from `expectedTransaction` at bytes `(20...24)`
        - Compare `fromIndex` to `accountIndex`
            - **If they do not match, determine that fraud has occurred.**

---

## Execution Fraud Proofs

### Invalid Signature
```csharp=
proveSignatureError(
  blockHeader, priorStateProof, transactionProof, accountProof
)
```

#### Input
* `blockHeader <BlockHeader>` - Header of the block being claimed as fraudulent.
* `priorStateProof <PriorStateProof>` - Proof of the state prior to executing the transaction. Type union of <BlockHeader | TransactionProof>
* `transactionProof <TransactionProof>` - Merkle proof of the transaction being challenged.
    * transaction
    * transactionIndex
    * siblings
* `accountProof <AccountProof>` - Merkle proof of the caller's account.
    * account
    * accountIndex
    * siblings

#### Process
##### 1. Verify inputs
* Assert that `blockHeader` represents a committed and pending block using `blockIsPending(blockHeader)`
* Assert that the provided `transactionProof` is valid using `rootHasTransaction(blockHeader.stateRoot, transactionProof.transaction, transactionProof.transactionIndex, transactionProof.siblings)`
* Assert that `priorStateProof` is valid using `provePriorState(priorStateProof, blockHeader, transactionProof.transactionIndex)`, which if successful returns `priorStateRoot`

##### 2. Check if the transaction should be signed and recover the signer
* Read the transaction prefix from the first byte as `prefix`
* Verify the transaction should be signed
    * If the prefix is **0x04** it is a `SOFT_WITHDRAW`
    * If the prefix is **0x05** it is a `SOFT_CREATE`
    * If the prefix is **0x06** it is a `SOFT_TRANSFER`
    * If the prefix is **0x07** it is a `SOFT_CHANGE_SIGNER`
    * If it is a different value, revert
* Set a value `signatureOffset` to the length of `transactionProof.transaction` minus `97`.
    * This is the offset to the beginning of the signature.
* Read bytes `(1...signatureOffset)` from `transactionProof.transaction` as `transactionData`.
* Read bytes `(signatureOffset...signatureOffset + 1)` from `transactionProof.transaction` as `SIG_V`.
    * if `SIG_V != 0x1B && SIG_V != 0x1C`, the signature is potentially malleable and therefore invalid: determine fraud has occurred.
* Read bytes `(signatureOffset + 1...signatureOffset + 33)` from `transactionProof.transaction` as `SIG_R`.
* Read bytes `(signatureOffset + 33...signatureOffset + 65)` from `transactionProof.transaction` as `SIG_S`.
    * if `SIG_S > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0`, the signature is potentially malleable and therefore invalid: determine fraud has occurred.
* Calculate the hash of `transactionData` as `transactionHash`.
* Use `ecrecover` to recover the address from the signature, set `signer` to the return value.
    * If `ecrecover` fails or returns the null address, determine fraud has occurred.

##### 3. Check if the signature is valid
* Assert that the provided `accountProof` is valid using `stateHasAccount(priorStateRoot, accountProof.account, accountProof.accountIndex, accountProof.siblings)`
* Call `accountHasSigner(accountProof.account, signer)` and set the result to `isValid`
* If `isValid` is false, determine that fraud has occurred
    * Signer is not approved for the account
* Otherwise, revert

---

### Duplicate Account Creation
```csharp=
proveDuplicateCreateError(
    header, priorStateProof, transactionProof, accountProof
) { ... }
```

#### Input
* `blockHeader <BlockHeader>` - Header of the block being claimed as fraudulent.
* `priorStateProof <PriorStateProof>` - Proof of the state prior to executing the transaction. Type union of <BlockHeader | TransactionProof>
* `transactionProof <TransactionProof>` - Merkle proof of the transaction being challenged.
    * transaction
    * transactionIndex
    * siblings
* `accountProof <AccountProof>` - Merkle proof of an account that has the same address as `transactionProof.transaction`, which already existed at the time it was executed. The merkle proof is made against the state root prior to the transaction.
    * account
    * accountIndex
    * siblings

#### Description
> Note: This is only for proving whether an account already existed in the state. If the intermediate state root for a create transaction is invalid, Invalid Execution (Create) must be used instead.

A creation transaction may only be executed to add an account to the state when it does not already exist. This proof is used if a creation transaction is present in a block where the state already had an account for the target address.

#### Process
##### 1. Verify the inputs
* Assert that the header represents a committed and pending block using `blockIsPending(header)`
* Assert that `priorStateProof` is valid using `provePriorState(priorStateProof, header, transactionProof.transactionIndex)`, which if successful returns `priorStateRoot`
* Assert that the provided `transactionProof` is valid using `rootHasTransaction(blockHeader.stateRoot, transactionProof.transaction, transactionProof.transactionIndex, transactionProof.siblings)`
* Assert that the provided state proof is valid using `stateHasAccount(stateRoot, accountProof.account, accountProof.accountIndex, accountProof.siblings)`

##### 2. Check the transaction
* Read the first byte from `transactionProof.transaction` as `prefix`.
* Assert that `prefix` is either `0x00` or `0x04`
* If `prefix` is `0x00`, set `transactionAddress` to the last 20 bytes of `transactionProof.transaction`
* Otherwise:
    * Set `signatureOffset` to `transactionProof.transaction.length - 32`
    * Read bytes `(signatureOffset - 20...signatureOffset)` from `transactionProof.transaction` as `transactionAddress`
* Read `address` from `accountProof.account` at bytes `(0...20)`
* Compare `address` to `transactionAddress`
    * **If they match, determine that fraud has occurred.**

---

### Transaction Execution Fraud

```csharp=
proveExecutionError(
  blockHeader, priorStateProof, transactionProof, accountProof1, accountProof2
) { ... }
```

#### Input
* `blockHeader <BlockHeader>` - Header representing the block with the transaction claimed to be fraudulent.
* `priorStateProof <PriorStateProof>` - Proof of the state prior to executing the transaction. Type union of <BlockHeader | TransactionProof>
* `transactionProof <TransactionProof>` - Merkle proof of the transaction being challenged.
    * transaction
    * transactionIndex
    * siblings
* `accountProof1 <AccountProof>` - Merkle proof of the first account in the previous state.
    * For a hard transaction, this will be for the recipient account.
    * Otherwise, it will be the sender's account.
    * Values:
        * account
        * accountIndex
        * siblings
* `accountProof2 <AccountProof>` - Merkle proof of the second account in the previous state.
    * For a hard transaction, this will be null.
    * account
    * accountIndex
    * siblings

#### Description
If a transaction is not executed correctly, it will have a bad intermediate `stateRoot` which can be proven with this fraud proof.

> Note: Hard withdrawal transactions where the caller had insufficient balance results in the new state root being the same as the previous one.

#### Process
##### 1. Verify the inputs
* Assert that the header represents a committed and pending block using `blockIsPending(blockHeader)`
* Assert that `priorStateProof` is valid using `provePriorState(priorStateProof, blockHeader, transactionProof.transactionIndex)`, which if successful returns `priorStateRoot`
* Assert that the provided `transactionProof` is valid using `rootHasTransaction(blockHeader.stateRoot, transactionProof.transaction, transactionProof.transactionIndex, transactionProof.siblings)`
* Read the first byte of `transactionProof.transaction` as `prefix`
* Read `newStateRoot` as the last 32 bytes of `transactionProof.transaction`
* Use `prefix` to determine what to do next:
    * **HARD_CREATE**: prefix = **0x00**
        * Read `toIndex` from `transactionProof.transaction` at bytes `(6...10)`
        * Read `value` from `transactionProof.transaction` at bytes `(10...17)`
        * Read `address` from `transactionProof.transaction` at bytes `(17...37)`
        * Read `initialSigningKey` from `transactionProof.transaction` at bytes `(37...57)`
        * Set `newNonce` to 3 `0` bytes
        * Initialize variable `newToAccount` as `(address ++ newNonce ++ value ++ initialSigningKey)`
        * Call `verifyAndPush(calculatedRoot, newToAccount, toIndex, accountProof2.siblings)`
            * If it fails, revert.
            * Otherwise set `calculatedRoot` to the return value.
        * Check if`calculatedRoot` is equal to the new state root.
            * If it is, revert.
            * If it is not, **determine that fraud has occurred.**
    * **SOFT_CREATE**: prefix = **0x05**
        * Read `fromIndex` from `transactionProof.transaction` at bytes `(0...4)`
        * Read `toIndex` from `transactionProof.transaction` at bytes `(4...8)`
        * Read `nonce` from `transactionProof.transaction` at bytes `(8...11)`
        * Read `value` from `transactionProof.transaction` at bytes `(11...18)`
        * Read `address` from `transactionProof.transaction` at bytes `(18...38)`
        * Read `initialSigningKey` from `transactionProof.transaction` at bytes `(38...58)`
        * Set variable `newFromAccount` to a copy of `accountProof1.account`
        * Check if `newFromAccount.balance > value && newFromAccount.nonce == nonce`
            * If both are true, go to the next step
            * If not, verify `accountProof1` using `stateHasAccount(priorStateRoot, accountProof1.account, fromIndex, accountProof1.siblings)`
                * If it succeeds, **determine fraud has occurred**. (If the account had an insufficient balance or the transaction had a bad nonce, the transaction should not have been in the block.)
                * Revert otherwise.
        * Set `newFromAccount.nonce` to `nonce + 1`
        * Set `newFromAccount.balance` to `newFromAccount.balance - value`
        * Call `verifyAndUpdate(priorStateRoot, accountProof1.account, newFromAccount, fromIndex, accountProof1.siblings)`
            * If it succeeds, set `calculatedRoot` to the return value.
            * If not, revert.
        * Set `newNonce` to 3 `0` bytes
        * Initialize variable `newToAccount` as `(address ++ newNonce ++ value ++ initialSigningKey)`
        * Call `verifyAndPush(calculatedRoot, newToAccount, toIndex, accountProof2.siblings)`
            * If it fails, revert.
            * Otherwise set `calculatedRoot` to the return value.
        * Check if`calculatedRoot` is equal to the new state root.
            * If it is, revert.
            * If it is not, **determine that fraud has occurred.**
    * **DEPOSIT**: prefix = **0x01**
        * Read `toIndex` from `transactionProof.transaction` at bytes `(6...10)`
        * Read `value` from `transactionProof.transaction` at bytes `(10...17)`
        * Set a variable `newAccount` to a copy of `accountProof1.account`
        * Set the balance in `newAccount` to `newAccount.balance + value`
        * Call `verifyAndUpdate(priorStateRoot, accountProof1.account, newAccount, toIndex, accountProof1.siblings)`
            * If it succeeds, set the new root to `calculatedRoot`
            * Revert otherwise.
        * Assert that `calculatedRoot` is equal to `newStateRoot`
    * **HARD_WITHDRAW**: prefix = **0x02**
        * Read `fromIndex` from `transactionProof.transaction` at bytes `(5...9)`
        * Read `value` from `transactionProof.transaction` at bytes `(9...17)`
        * Set variable `newFromAccount` to a copy of `accountProof1.account`
        * Check if `newFromAccount.balance > value`
            * If it is not:
                * Call `verifyMerkleRoot(priorStateRoot, newFromAccount, fromIndex, accountProof1.siblings)`
                * If it succeeds, check if `newStateRoot` is equal to `priorStateRoot` (withdrawal rejected)
                    * If not, **determine that fraud has occurred**
                    * Otherwise, revert
            * Otherwise, continue.
        * Set `newFromAccount.balance` to `newFromAccount.balance - value`
        * Call `verifyAndUpdate(priorStateRoot, accountProof1.account, newFromAccount, fromIndex, accountProof1.siblings)`
            * If it succeeds, set `calculatedRoot` to the return value.
            * If not, revert.
        * Check if`calculatedRoot` is equal to the new state root.
            * If it is, revert.
            * If it is not, **determine that fraud has occurred.**
    * **SOFT_WITHDRAW**: prefix = **0x04**
        * Read `fromIndex` from `transactionProof.transaction` at bytes `(0...4)`
        * Read `nonce` from `transactionProof.transaction` at bytes `(24...27)`
        * Read `value` from `transactionProof.transaction` at bytes `(27...34)`
        * Set variable `newFromAccount` to a copy of `accountProof1.account`
        * Check if `newFromAccount.balance > value && newFromAccount.nonce == nonce`
            * If it is not:
                * Call `verifyMerkleRoot(priorStateRoot, newFromAccount, fromIndex, accountProof1.siblings)`
                * If it succeeds, check if `newStateRoot` is equal to `priorStateRoot` (withdrawal rejected)
                    * If not, **determine that fraud has occurred**
                    * Otherwise, revert
            * Otherwise, continue.
        * Set `newFromAccount.balance` to `newFromAccount.balance - value`
        * Set `newFromAccount.nonce` to `newFromAccount.nonce + 1`
        * Call `verifyAndUpdate(priorStateRoot, accountProof1.account, newFromAccount, fromIndex, accountProof1.siblings)`
            * If it succeeds, set `calculatedRoot` to the return value.
            * If not, revert.
        * Check if`calculatedRoot` is equal to `newStateRoot`.
            * If it is, revert.
            * If it is not, **determine that fraud has occurred.**
    * **TRANSFER**: prefix = **0x06**
        * **1. Verify the state of the sender account**
        * **2. Make sure it had a sufficient balance and matching nonce.**
        * **3. Calculate the new root if the account balance decreases by `value`.**
        * **4. Verify the state of the receiver account. Calculate the new root if its balance increases by `value`.**
        * Read `fromIndex` from `transactionProof.transaction` at bytes `(0...4)`
        * Read `toIndex` from `transactionProof.transaction` at bytes `(4...8)`
        * Read `nonce` from `transactionProof.transaction` at bytes `(8...11)`
        * Read `value` from `transactionProof.transaction` at bytes `(11...18)`
        * Read `newStateRoot` from the last 32 bytes of `transactionProof.transaction`
        * Set variable `newFromAccount` to a copy of `accountProof1.account`
        * Check if `newFromAccount.balance > value && newFromAccount.nonce == nonce`
            * If either check fails:
                * Call `verifyMerkleRoot(priorStateRoot, newFromAccount, fromIndex, accountProof1.siblings)`
                    * If it succeeds, **determine that fraud has occurred** (inclusion of a transaction where sender had insufficient balance or invalid nonce)
            * Otherwise, continue.
        * Set `newFromAccount.balance` to `newFromAccount.balance - value`
        * Set `newFromAccount.nonce` to `newFromAccount.nonce + 1`
        * Call `verifyAndUpdate(priorStateRoot, accountProof1.account, newFromAccount, fromIndex, accountProof1.siblings)`
            * If it succeeds, set `calculatedRoot` to the return value.
            * If not, revert.
        * Set `newToAccount` to a copy of `accountProof2.account`
        * Set `newToAccount.balance` to `newToAccount.balance + value`
        * Call `verifyAndUpdate(calculatedRoot, accountProof2.account, newToAccount, toIndex, accountProof2.siblings)`
            * If it succeeds, set `calculatedRoot` to the return value.
            * If not, revert.
        * Check if`calculatedRoot` is equal to `newStateRoot`.
            * If it is, revert.
            * If it is not, **determine that fraud has occurred.**
    * **SOFT_CHANGE_SIGNER**: prefix = **0x07**
        * Read `accountIndex` from bytes `(0...4)` of `transactionProof.transaction`
        * Read `nonce` from bytes `(4...7)` of `transactionProof.transaction`
        * Read `signingAddress` from bytes `(7...27)` of `transactionProof.transaction`
        * Read `modificationCategory` from bytes `(27...28)` of `transactionProof.transaction`
        * Read `newStateRoot` from the last 32 bytes of `transactionProof.transaction`
        * Set variable `newAccount` to a copy of `accountProof1.account`
        * Check if `newAccount.nonce == nonce`
            * If it is, go to the next step.
            * If not, verify `accountProof1` using `stateHasAccount(priorStateRoot, accountProof1.account, accountIndex, accountProof1.siblings)`
                * If it succeeds, **determine fraud has occurred**. (If the transaction had a bad nonce, the transaction should not have been in the block.)
                * If it fails, the challenger gave a bad input - revert.
        * **If `modificationCategory` is 0, the transaction should add a signer to the account.**
            * **Verify that the account can add new signers and that the new signing address is not already present in the account.**
                * Set `signerCount` to `(newAccount.length - 30) / 20`
                * Set `redundantSigner` to the return value of `accountHasSigner(accountProof1, signingAddress)`
                * Check if `(signerCount <= 9 && !redundantSigner)`
                    * If both are true, go to the next step.
                    * If not, verify `accountProof1` using `stateHasAccount(priorStateRoot, accountProof1.account, accountIndex, accountProof1.siblings)`
                        * If it succeeds, **determine fraud has occurred**. (The account modification is redundant or exceeds the maximum account size, so the transaction should not have been included.)
                        * If it fails, the challenger gave a bad input - revert.
            * **Execute the state transition and verify the output state root**
                * Copy `signingAddress` to the end of `newAccount`
                * Set `newAccount.nonce += 1`
                * Call `verifyAndUpdate(priorStateRoot, accountProof1.account, newAccount, accountIndex, accountProof1.siblings)`
                    * If it succeeds, set `calculatedRoot` to the return value.
                    * If not, revert.
                * Check if`calculatedRoot` is equal to `newStateRoot`.
                    * If it is, revert.
                    * If it is not, **determine that fraud has occurred.**
        * **If `modificationCategory` is 1, the transaction should remove a signer from the account.**
            * Set a variable `hasAccount` to `false`
            * **Verify that the account has the specified address**
                * Set a variable `nextOffset` to `30` (pointer to beginning of first signer address)
                * Execute a while loop with condition `(nextOffset < newAccount.length)` to read each signer address in the account
                    * Read bytes `(nextOffset...nextOffset+20)` from `newAccount` as `nextSigner`
                    * If `signer == nextSigner` set `hasAccount = true` and break
                    * Set `nextOffset += 20`
                * If `hasAccount == true` go to the next step.
                * If it is false, verify `accountProof1` using `stateHasAccount(priorStateRoot, accountProof1.account, accountIndex, accountProof1.siblings)`
                    * If it succeeds, **determine fraud has occurred**. (The account did not include the specified signer address, so the transaction should not have been included.)
                    * If it fails, the challenger gave a bad input - revert.
            * **Execute the state transition and verify the output state root**
                * Copy bytes `(0...nextOffset)` from `newAccount` to a new variable `prefix`
                * Copy bytes `(nextOffset+20...newAccount.length)` from `newAccount` to a new variable `suffix`
                * Set `newAccount` to `prefix ++ suffix`
                * Set `newAccount.nonce += 1`
                * Call `verifyAndUpdate(priorStateRoot, accountProof1.account, newAccount, accountIndex, accountProof1.siblings)`
                    * If it succeeds, set `calculatedRoot` to the return value.
                    * If not, revert.
                * Check if`calculatedRoot` is equal to `newStateRoot`.
                    * If it is, revert.
                    * If it is not, **determine that fraud has occurred.**
        * If `modificationCategory` is any other value, **determine that fraud has occurred.**
