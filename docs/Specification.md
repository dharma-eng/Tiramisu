# Dharma L2 - Spec

_Authors: @_**0age** _& @_**d1ll0n**

Scaling out Dharma's user base will require a transition of the Dharma Dai token to "Layer 2". This spec outlines an initial implementation using Optimistic Rollup. It endeavors to remain as simple as possible while still affording important security guarantees and significant efficiency improvements. It is designed to fill the current application requirements of scalable token transfers, with the expectation that we will eventually move to a more mature, generic L2 as production-ready platforms come online.

## Table of Contents

- [Dharma L2 - Spec](#dharma-l2---spec)
  - [Table of Contents](#table-of-contents)
- [Overview](#overview)
- [State](#state)
- [Transactions](#transactions)
  - [Transaction Types](#transaction-types)
    - [Hard Transaction Types](#hard-transaction-types)
    - [Soft Transaction Types](#soft-transaction-types)
  - [Deposits](#deposits)
    - [Default Deposits](#default-deposits)
    - [Create Deposits](#create-deposits)
    - [Pre-Processing](#pre-processing)
  - [Transfers](#transfers)
    - [Default Transfers](#default-transfers)
    - [Create Transfers](#create-transfers)
  - [Withdrawals](#withdrawals)
    - [Soft Withdrawals](#soft-withdrawals)
    - [Hard Withdrawals](#hard-withdrawals)
  - [Signer Modification](#signer-modification)
    - [Default Signer Modification](#default-signer-modification)
    - [Hard Signer Addition](#hard-signer-addition)
- [Block](#block)
  - [Header](#header)
  - [Transactions Array](#transactions-array)
  - [Transactions Merkle Tree](#transactions-merkle-tree)
- [Block Production](#block-production)
- [Peg Contract](#peg-contract)
  - [Block Submission](#block-submission)
  - [Block Confirmation](#block-confirmation)
  - [Withdrawals](#withdrawals-1)
  - [Fraud Proofs](#fraud-proofs)
    - [Overview](#overview-1)
    - [Block Errors](#block-errors)
    - [Fraud Proof Specification](#fraud-proof-specification)

# Overview

This spec has been designed to meet the following requirements:

- The system must be able to support deposits, transfers, and withdrawals of a single ERC20 token: Dharma Dai.
- All participants must remain in control of their tokens, with any transfer requiring their authorization via a valid signature, <!-- _(or set of signatures)_ --> and with the ability to exit the system of their own volition.
- All participants must be able to locally recreate the current state of the system based on publicly available data, and to roll back an invalid state during a challenge period by submitting a proof of an invalid state transition.
- The system should be able to scale out to support a large user base, allowing for faster L2 transactions and reducing gas costs by at least an order of magnitude compared to L1.

In contrast, certain properties are explicitly _not_ required in the initial spec:

- Transactions do not require strong guarantees of censorship resistance _(as long as unprocessed deposits and exits remain uncensorable)_ — Dharma Labs will act as the sole block producer, thereby simplifying many aspects of the system.
- Generic EVM support _(indeed, even support for \_any_ functionality beyond token transfers)\_ is not required — this greatly simplifies the resultant state, transaction, block production, and fraud proof mechanics.
- Scalability does not need to be maximal, only sufficient to support usage in the near-term under realistic scenarios — we only need to hold out until more efficient data-availability oracles or zero-knowledge circuits and provers become production-ready.

# State

The world state will be represented as a collection of accounts, each designated by a unique 32-bit index _(for a maximum of 4,294,967,296 accounts)_, as well as by a 32-bit `stateSize` value that tracks the total number of accounts. Each account will contain:

- the address of the account _(represented by a 160-bit value)_
- the nonce of the account _(represented by a 24-bit value, capped at 16,777,216 transactions per account)_
- the balance of the account _(represented by a 56-bit value, capped at 720,575,940 dDai per account)_
- an array of unique signing addresses _(represented by concatenated 160 bit addresses, with a maximum of 10 signing addresses per account, in order of assignment)_
  The state is represented as a merkle root, composed by constructing a sparse merkle tree with accounts as leaves. Each leaf hash is the hash of `keccak256(address ++ nonce ++ balance ++ signing_addresses)`.

Accounts that have not yet been assigned are represented by 32 zero bytes, the value of an empty leaf node in the sparse merkle tree.

Accounts are only added, and `stateSize` incremented, when processing deposits or transfers to accounts that were previously empty _(also note that_ `stateSize` _is never decremented)_. The state root will be updated accordingly whenever accounts are added or modified.

# Transactions

Each transaction contains a concise representation of the fields used to apply the given state transition, as well as the intermediate state root that represents the state immediately after the transition has been applied. There are two general classes of transaction: those initiated from Ethereum mainnet by calling into the contract that mediates interactions with layer two, and those initiated from layer two directly via signature from a signing key on the account.

## Transaction Types

Transactions in this blockchain have specific types that determine how they are executed. The type is indicated by a "prefix" byte in the transaction encoding, which allows the code to treat a transaction as a type union.

### Hard Transaction Types

Transactions initiated from mainnet, referred to throughout as "hard" transactions, can be one of the following four types:

- `HARD_CREATE`: Deposits to accounts that do not yet exist on layer two
- `HARD_DEPOSIT`: Deposits to accounts that already exist on layer two
- `HARD_WITHDRAW`: Explicit withdrawal requests, or "hard withdrawals"
- `HARD_ADD_SIGNER`: Addition of signer keys to existing layer two accounts

Whenever the mediating contract on mainnet receives a hard transaction request, it will increment a `hardTransasctionIndex` value and associate that index with the supplied transaction. Then, whenever the block producer proposes new blocks that include hard transactions, it must include a set with continuous indices that starts at the last processed hard transaction index — in other words, the block producer determines the number of hard transactions to process in each block, but specific hard transactions cannot be "skipped".

> Note: while the requirement to process each hard transaction protects against censorship of specific transactions, it does not guard against system-wide censorship — the block producer may refuse to process _any_ hard transactions. Various remediations to this issue include instituting additional block producers, including "dead-man switch" mechanics, or allowing for users to update state directly under highly specific circumstances, but the implementation thereof is currently outside the scope of this spec.

### Soft Transaction Types

In contrast, "soft" transactions are initiated from layer two directly, with their inclusion in blocks at the discretion of the block producer. These include:

- `SOFT_WITHDRAW`: Transfers from an account to the account owner's address on layer one
- `SOFT_CREATE`: Transfers from one account to another account that does not yet exist on layer two
- `SOFT_TRANSFER`: Transfers between accounts that already exist on layer two
- `SOFT_CHANGE_SIGNER`: Addition or removal of a signing key from an account

Each soft transaction must bear a signature that resolves to one of the signing keys on the account initiating the transaction in order to be considered valid. Hard transactions, on the other hand, do not require signatures — the caller on mainnet has already demonstrated control over the relevant account.

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

### Pre-Processing

In the current instantiation of the contracts and blockchain software, all deposits are recorded on mainnet as ambiguous deposits, since the mainnet contract has no way of knowing whether the target account already exists. This increases the cost of a deposit but simplifies the interface.

Before a block is executed, the ambiguous deposits will be processed to determine whether they should be interpreted as creates or default deposits. A local struct is created to map addresses to pending indices, and the current state size is copied as an incrementing index of pending account locations.

For each ambiguous deposit, the target address is queried from the state. If there is an account owned by the address or if the local pending indices mappping has an entry for the address, the deposit is cast to a default deposit and assigned the appropriate account index. If there is no account in either the state or the local pre-processing map, the deposit is cast to a create deposit and the target address is saved in the local mapping with the local pending account index, which is then incremented.

## Transfers

In order to transfer tokens between accounts in L2, anyone with a signing key attached to a given account can produce a signature authorizing a transfer to a particular recipient.

The block producer will then use that signature to construct a valid transaction that debits the respective amount from the balance of the signer's account and credits it to the recipient specified by the signer. Note that all transfers are "soft" transactions.

### Default Transfers

The default transfer transaction type entails sending funds between two non-empty accounts. They contains the following fields:

- `nonce` _(24 bits)_
- `from: accountIndex` _(32 bits)_
- `to: accountIndex` _(32 bits)_
- `value` _(56 bits)_
- `signature` _(520 bits)_
- `intermediateStateRoot` _(256 bits)_

This gives a serialized default transfer transaction length of 920 bits, or 115 bytes.

### Create Transfers

In addition, there is an "account creation" transfer transaction type that is used when transferring to an account that has never been used before. These transaction types are only valid in cases where both the account in question and its corresponding address do not yet exist, and where the specified `to` index is equal to the current `stateSize` value.

When a create transfer is signed by the sender, the `to` index is encoded as a null buffer, as the sender will not know which index will eventually be assigned to the new account.

Account creation transfer transaction types extend the default transfer transaction type as follows:

- `nonce` _(24 bits)_
- `from: accountIndex` _(32 bits)_
- `to: accountIndex` _(32 bits)_
- `value` _(56 bits)_
- `toAddress` _(160 bits)_
- `initialSigningKey` _(160 bits)_
- `signature` _(520 bits)_
- `intermediateStateRoot` _(256 bits)_

This gives a serialized account creation transfer transaction length of 1240 bits, or 155 bytes.

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

Each withdrawal proof verifies that the associated transactions are present and valid for each withdrawal to process, then updates the respective historical transaction root and corresponding block root to reflect that the withdrawal has been processed.

### Hard Withdrawals

Additionally, users may call into a dedicated contract on L1 to schedule a "hard" withdrawal from an account on L2 if the caller's account has a balance on L2. In doing so, the `hardTransasctionIndex` is incremented and assigned to the withdrawal.

The block producer will then reference that index in order to construct a valid transaction that debits the caller's account on L2 and enables the caller to retrieve the funds once the 24-hour finalization window has elapsed.

In order to ensure that funds are only withdrawn by valid parties, the hard withdrawal object includes the address of the account that requested the withdrawal on L1. When the transaction is executed, the block producer ensures that the caller matches the account address in the account indicated by the transaction.

The hard withdrawal transaction type contains the following fields:

- `transactionIndex` _(40 bits)_
- `from: accountIndex` _(32 bits)_
- `callerAddress` _(160 bits)_
- `value` _(56 bits)_
- `intermediateStateRoot` _(256 bits)_

This gives a serialized hard withdrawal transaction length of 564 bits, or 68 bytes.

## Signer Modification

All soft transactions must be signed by one of the signing keys attached to the originating account. The initial signing key is set during account creation as part of a deposit or transfer — an independent transaction is required in order to add additional keys or remove an existing key.

### Default Signer Modification

The `SOFT_CHANGE_SIGNER` transaction type is used in order to add or remove signing keys from non-empty accounts using a signature from an existing signing key on that account. They contain the following fields:

- `nonce` _(24 bits)_
- `accountIndex` _(32 bits)_
- `signingAddress` _(160 bits)_
- `modificationCategory` _(8 bits)_
- `signature` _(520 bits)_
- `intermediateStateRoot` _(256 bits)_

This gives a serialized signer modification transaction length of 1000 bits, or 125 bytes.

The `modificationCategory` value will initially have only two possible values: `0x00` for adding a key and `0x01` for removing a key. Accounts can store a maximum of 10 signing keys. Keys can only be added if they are not already set on a given account, and are added to the end of the array of signing keys. They can only be removed if the key in question is currently set on the given account, and are "sliced" out of the array.

> Note: If all signing keys are removed from an account, it will no longer be possible to submit soft transactions from that account. Recovering funds from the address in question will require intervention from layer one via a hard withdrawal.

### Hard Signer Addition

The `HARD_ADD_SIGNER` transaction type is used to add signing keys to non-empty accounts using the address of that account on L1. The address which calls the L1 contract to record the transaction is saved in the input, and must be the address of the account's owner for it to be executed.

The input and output types for the transaction contain different fields, as the transactions in the block are used for fraud proofs and block auditing purposes, but the inputs to the transaction already exist on L1 and can be recovered for block execution by third parties.

The input type has the fields:

- `hardTransasctionIndex` _(40 bits)_
- `accountIndex` _(32 bits)_
- `callerAddress` _(160 bits)_
- `signingAddress` _(160 bits)_

The output type has the fields:

- `hardTransasctionIndex` _(40 bits)_
- `accountIndex` _(32 bits)_
- `signingAddress` _(160 bits)_
- `intermediateStateRoot` _(256 bits)_

This gives a serialized signer addition transaction length of 488 bits, or 61 bytes.

The hard signer addition transaction adds an address to the array of signing keys, where the signing address is not already present in the array and the array is not at its maximum length. If these requirements are not met, or if the caller that recorded the transaction is not approved to perform this action, the transaction will be rejected. If the transaction is rejected, it will still be included in the block, but the `intermediateStateRoot` value will be equal to the state root prior to the transaction.

# Block

Blocks contain all data required to audit transaction execution and reproduce the resulting state of the blockchain. The body of a block contains the [transactions buffer](#Transactions-Array) which is encoded in a tightly packed form to reduce the cost of block submission. Blocks also contain a header with metadata about the resulting state of the chain and execution context.

## Header

Block headers are encoded in one of two forms: an input or an output form.

The input header is created by the block producer and submitted to the mainnet contract, where it is processed into an output header.

The input header has the following fields:

- `version` _(16 bits)_ A version number used to indicate the blockchain execution and serialization scheme
- `blockNumber` _(32 bits)_ The index of the block in the chain history
- `stateSize` _(32 bits)_ The size of the state after the block's execution
- `stateRoot` _(256 bits)_ The root hash of the state tree after the block's execution
- `hardTransactionsCount` _(40 bits)_ The total number of hard transactions which have been processed by the chain after the block's execution
- `transactionsRoot` _(256 bits)_ Root hash of the [transactions merkle tree](#Transactions-Merkle-Tree)

The output header has two additional fields which may only be set by the mainnet contract upon block submission:

- `transactionsHash` _(256 bits)_ The keccak256 hash of the block's `transactionsData` field
- `submittedAt` _(256 bits)_ The block number on mainnet at the time the block was submitted.

## Transactions Array

All transaction data is provided whenever new blocks are submitted so that third parties may audit the block for errors and reproduce the resulting state. Blocks contain an array for each type of transaction, ordered by the prefix of the transaction type. The transactions array is encoded with a format similar to ABI packed encoding, with the only difference being that members of dynamic types are still tightly packed. The encoded transactions array is referred to throughout as the transactions buffer, and is named `transactionsData` in the block structure.

> Note: In the transactions buffer, encoded transactions do not include a prefix.

The transactions buffer is prefixed with a 16 byte 'metadata' structure which contains a 2 byte field for each transaction type indicating the number of transactions for that type. The size of the length field gives an upper limit of 65,536 of each type of transaction per block, which is well above the block size limit of Ethereum. The fields in the metadata struct are:

- `hardCreateCount` _(16 bits)_
- `hardDepositCount` _(16 bits)_
- `hardWithdrawCount` _(16 bits)_
- `hardAddSignerCount` _(16 bits)_
- `softWithdrawCount` _(16 bits)_
- `softCreateCount` _(16 bits)_
- `softTransferCount` _(16 bits)_
- `softChangeSignerCount` _(16 bits)_

As a simplifying restriction, hard transactions are always executed before soft transactions; within those two categories, withdrawals are always processed first, followed by account creations, then transfers and finally signer modifications.

Every transaction type has a fixed size and all transaction types end in a 32-byte intermediate state root that is used to determine invalid execution in the respective fraud proof. Transaction serialization formats and other details are outlined in the relevant sections below.

> Note: intermediate state roots can optionally be applied to chunks of transactions rather than to each transaction, with the trade-off of increased complexity in the required fraud proof.

The order of transactions in the transactions array is also the order of execution in the block. Hard transactions are always executed first, but are not necessarily executed in order of the hard transaction index. Hard transactions are first sorted by type, then within each type the transactions are sorted by hard transaction index.

## Transactions Merkle Tree

The set of transactions for each block is used to form a standard indexed merkle tree (as opposed to the sparse merkle tree used for the state), where each leaf node is the prefixed form of the transaction encoding (including the intermediate state root). The one-byte prefix for each transaction type is as follows:

- `HARD_CREATE`: `0x00`
- `HARD_DEPOSIT`: `0x01`
- `HARD_WITHDRAW`: `0x02`
- `HARD_ADD_SIGNER`: `0x03`
- `SOFT_WITHDRAW`: `0x04`
- `SOFT_CREATE`: `0x05`
- `SOFT_TRANSFER`: `0x06`
- `SOFT_CHANGE_SIGNER`: `0x07`

The root hash of this merkle tree is derived and placed in the block header prior to block submission. The merkle tree is used to reduce the cost of fraud proofs, but the derivation of the merkle root can itself be challenged via a fraud proof if it does not match the transactions buffer.

# Block Production

Dharma Labs will produce successive blocks off-chain, incorporating transactions submitted to its API and transactions submitted on-chain.

**Hard Transaction Retrieval**

Immediately before processing a block, Dharma will query the peg contract for new hard transactions which have been submitted since the last query it made. A configurable parameter in the blockchain software `MAX_HARD_TRANSACTIONS` identifies the maximum number of hard transactions that the chain will execute in a given block. This parameter is not subject to any kind of fraud proof and is not stored anywhere on-chain, as it is only used to restrict the amount of gas spent per block submission.

**Soft Transaction Queue**

Dharma will maintain an off-chain API by which users of the l2 chain can submit "soft" transactions. When a soft transaction is submitted, a basic integrity check will be used to ensure the transaction is at least possibly valid: this check entails verifying that the encoding matches the transaction type and that it has a valid signature, but not that the transaction is actually valid according to the current state of the blockchain, as it could _become_ valid based on other transactions which will be executed first.

The L2 blockchain software will retrieve the current set of pending soft transactions from the queue, up to some per-block limit, and combine them with the hard transactions to make the full set of transactions which will be placed in the block.

**Transaction Sorting**

Once the hard and soft transactions have been retrieved, the transactions will be sorted with the following logic:

1. Sort the transactions into separate arrays based on their prefixes.
2. Sort the hard hard transactions in each array by index.
3. Sort the soft transactions in each array by nonce.

> Note: Since soft transactions from an individual user must have incrementing nonces, the prefix separation may cause some soft transactions to be rejected. There is no penalty for this, but it could cause some unexpected behavior in rare circumstances, and may result in users needing to resubmit transactions. This could be handled by separating the soft transactions into different blocks.

**Transaction Execution**

Once the transactions have been sorted into their typed arrays, they will be executed according to the state transition function accompanied with each transaction type.

Each transaction type, except for hard creates and deposits, which are pre-processed to guarantee run-time validity, has an associated test of the blockchain preconditions to ensure it is allowable. This test is performed when the transaction is reached in the block execution process. If the test passes, the transaction will continue to be executed.

If a hard transaction fails validation, the state machine will cease execution and set the previous state root as the intermediate state root for the transaction. If a soft transaction fails validation, it will be rejected and removed from the block entirely.

Once a transaction is successfully executed and its results applied to the state, the resulting state root will be assigned to the transaction's intermediate state root field.

**Block Header**

Once the transactions in a block have been executed, the new block header will be produced by taking the previous block header and modifying the following values:

- `stateSize` - Set to the new state size.
- `hardTransactionsCount` - Incremented by the number of hard transactions included in the block.
- `blockNumber` - Incremented by one.
- `stateRoot` - Set to the root hash of the state tree.
- `transactionsRoot` - Set to the root hash of the derived [transactions merkle tree](#Transactions-Merkle-Tree).

**Block Input**

The block input will then be created as:

- `header` - "input" form of the block header, derived in the previous step
- `transactionsData` - encoded [transactions buffer](#Transactions-Array)

**Block Submission**

Once the block is created, Dharma will submit the input form of the block to the peg contract. The block submission must include 100 Dharma Dai as collateral against fraud.

The peg contract will produce the full block header by setting the `submittedAt` field to the current block number of the mainnet chain and setting the `transactionsHash` field to the keccak256 hash of the transactions buffer. Once Dharma receives the receipt of the transaction as confirmation of the block's inclusion on the peg contract, it will set these fields and save the full block in its database.

Once the block is finalized, meaning the confirmation period has passed without the block being reverted due to fraud, the 100 Dai collateral will be returned to Dharma.

> Note: A bonding commitment of 100 Dharma Dai per block would result in a total commitment of 576,000 Dharma Dai at maximum capacity, i.e. with blocks being committed for every new block on the Ethereum mainnet — this would imply that ~5000 transactions are being processed each minute over the entirety of a 24-hour period. A more realistic total commitment would likely be at least an order of magnitude lower than this maximum.

# Peg Contract

The peg contract is the interface between Ethereum and the Dharma blockchain, as well as the sole arbiter of block validity. It tracks the history of the Dharma chain and acts as an escrow account holding all tokens on the sidechain.

New blocks on the sidechain are submitted to this contract and recorded as pending for a period of time called the confirmation period, which is defined in the chain configuration, during which anyone can audit the block for errors and submit fraud proofs.

The peg contract allows accounts on Ethereum to record "hard" transactions which the Dharma chain must execute.

If submitted blocks are invalid, anyone may submit a fraud proof to this contract to prove that the block contains some error, which will cause the block to be reverted. If fraud is proven, the operator (Dharma) will be penalized and the prover will be rewarded.

## Block Submission

When a block is submitted by Dharma, the peg contract will verify that the transaction was submitted by the configured block producer address, that it included the requisite collateral of 100 Dharma Dai, and that the block number in the submitted block is equal to the current total number of blocks submitted. It will then produce the complete block header as described in [Block Production](#Block-Production) and save the block as pending.

## Block Confirmation

When the confirmation period of a pending block has passed without the block being proven fraudulent, anyone may call the `confirmBlock` function to mark the block as confirmed. This will mark the block as confirmed and return the collateral to the Dharma block producer address.

## Withdrawals

When a block is confirmed, the withdrawal transactions in the block will be able to be processed. This function takes the transactions buffer from the block as an argument and decodes the `withdrawalAddress` and `value` fields from each hard and soft withdrawal transaction in the buffer. Hard withdrawals which contain an intermediate state root equal to the previous transaction (i.e. rejected hard withdrawals) will be ignored during this process. The blockhash will then be marked as having been processed for withdrawals, and the peg contract will transfer `value` Dai to `withdrawalAddress` in each decoded withdrawal.

## Fraud Proofs

Once blocks are submitted, they must undergo a 24-hour "challenge" period before they become finalized. During this period, any block containing an invalid operation can be challenged by any party that submits sufficient proof to invalidate any part of the block. In doing so, the state will be rolled back to the point when the fraudulent block was submitted. Furthermore, the bonded stake provided when submitting the fraudulent block, as well as the stake of each subsequent block, will be siezed, with half irrevocably burned (with the equivalent backing collateral distributed amongst all Dharma Dai holders via an increase in the exchange rate) and half provided to the submitter as a reward.

### Overview

Without a scheme where blocks can be proven correct by construction _(such as ZK Snarks)_ it is necessary for the L1 to have contracts capable of auditing L2 block execution in order to keep the L2 chain in a valid state. These contracts do not fully reproduce L2 execution and thus do not explicitly verify blocks as being correct; instead, each fraud proof is capable of making only a determination of whether a particular aspect of a block (and thus the entire block) is definitely fraudulent.

An individual fraud proof makes implicit assumptions about the validity of parts of the block which it is not explicitly auditing. These assumptions are only sound given the availability of other fraud proofs capable of auditing those parts of the block it does not itself validate.

Each fraud proof is designed to perform minimal computation with the least calldata possible to audit a single aspect of a block. This is to ensure that large blocks which would be impossible or extremely expensive to audit on the L1 chain can be presumed secure without arbitrarily restricting their capacity to what the L1 could fully reproduce.

### Block Errors

The possible errors that could occur in a block and which are covered by fraud proofs are:

- Supplying a header with a `stateSize` that does not accurately increment the prior `stateSize` by the total number of account creation transactions indicated in the transactions metadata _(State Size Error)_.
- Supplying a header with a `stateRoot` that is not equal to the intermediate state root of the block's last transaction _(State Root Error)_.
- Supplying a header with a `hardTransactionsCount` that does not accurately increment the prior `hardTransactionsCount` by the number of hard transactions indicated by the transactions metadata _(Hard Transactions Count Error)_.
- Supplying a transactions buffer which does not order the hard transactions of each type by their respective indices _(Hard Transactions Order Error)_.
- Supplying a transactions buffer which does not include a transaction for each index between the prior hard transactions count and the new hard transactions count, or which contains transactions with a duplicate `hardTransactionIndex` _(Hard Transactions Range Error)_.
- Supplying a transactions buffer which does not have the length indicated by the transactions metadata (by multiplying each type count by the size of that type's serialization format) _(Transactions Length Error)_.
- Supplying a hard transaction which is inconsistent with the input fields recorded on the peg for its `hardTransactionIndex` _(Hard Transaction Source Error)_.
- Supplying a soft transaction with an invalid signature _(Invalid Signature Error)_.
- Supplying an account creation transaction for an account that already exists in the state _(Duplicate Account Creation Error)_.
- Supplying an account creation transaction which has a created index that is not equal to the previous state size (based on the last create transaction, or previous block header for the first create transaction) plus one _(Create Index Error)_.
- Supplying an intermediate state root that does not accurately reflect the execution of a given transaction, including giving a root that is different from the previous state root for a hard transaction which should have been rejected, or giving the previous state root for a hard transaction which should not have been rejected _(Transaction Execution Error)_.

> Note: certain simple operations do not need fraud proofs as they can be checked upon block submission. For example, supplying a new block with an incorrect value for `newBlockNumber` that does not accurately increment the prior `blockNumber` by one will revert.

### Fraud Proof Specification

See [Fraud Proofs](./Fraud%20Proofs.md)
