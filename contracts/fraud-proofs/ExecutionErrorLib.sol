pragma solidity ^0.6.0;

import { StateLib as State } from "../lib/StateLib.sol";
import { TransactionsLib as Tx } from "../lib/TransactionsLib.sol";
import { AccountLib as Account } from "../lib/AccountLib.sol";
import { BlockLib as Block } from "../lib/BlockLib.sol";
import { MerkleProofLib as Merkle } from "../lib/merkle/MerkleProofLib.sol";
import { FraudUtilsLib as utils } from "./FraudUtilsLib.sol";


library ExecutionErrorLib {
  using Block for Block.BlockHeader;
  using State for State.State;
  using Tx for bytes;
  using Account for Account.Account;
  using Account for bytes32;
  using utils for State.State;

  /**
   * Determine how many successful create transactions were executed prior to `index`.
   */
  function executedCreatesBeforeIndex(
    bytes memory txData,
    uint256 index
  ) internal pure returns (uint256 pointer, uint256 creates, bool hard) {
    Tx.TransactionsMetadata memory meta = txData.decodeTransactionsMetadata();
    assembly { pointer := add(txData, 48) }
    uint256 currentIndex = 0;

    if (index < meta.hardCreateCount) {
      while (currentIndex < index) {
        assembly { if iszero(iszero(mload(add(pointer, 56)))) { creates := add(creates, 1) } }
        currentIndex++;
      }
      pointer += index * 88;
      return (pointer, creates, true);
    }

    while (currentIndex <= meta.hardCreateCount) {
      assembly {
        if iszero(iszero(mload(add(pointer, 56)))) {
          creates := add(creates, 1)
        }
      }
      currentIndex++;
      pointer += 88;
    }
    currentIndex += (
      meta.hardDepositCount + meta.hardWithdrawCount +
      meta.hardAddSignerCount + meta.softWithdrawCount
    );
    require(
      index >= currentIndex &&
      index < currentIndex + meta.softCreateCount,
      "Not a valid create index."
    );

    pointer += (
      (meta.hardDepositCount * 48) + (meta.hardWithdrawCount * 68) +
      (meta.hardAddSignerCount * 61) + (meta.softWithdrawCount * 131)
    );
  }

  /**
   * @dev proveCreateIndexError
   * Prove that the account index in a create transaction was not equal to the
   * state size of the previous block plus the sum of create
   * transactions executed previously in the same block.
   */
  function proveCreateIndexError(
    State.State storage state,
    Block.BlockHeader memory previousHeader,
    Block.BlockHeader memory badHeader,
    uint256 transactionIndex,
    bytes memory transactionsData
  ) internal {
    state.blockIsPendingAndHasParent(badHeader, previousHeader);

    require(
      badHeader.hasTransactionsData(transactionsData),
      "Header does not match transactions data."
    );
    (
      uint256 pointer, uint256 creates, bool hard
    ) = executedCreatesBeforeIndex(transactionsData, transactionIndex);
    uint256 expectedIndex = previousHeader.stateSize + creates;
    uint256 accountIndex;

    if (hard) assembly { accountIndex := shr(224, mload(add(pointer, 5))) }
    else assembly { accountIndex := shr(224, mload(add(pointer, 3))) }

    require(expectedIndex != accountIndex, "Transaction had correct index.");
    return state.revertBlock(badHeader);
  }

  /**
   * @dev Validate a hard create execution error proof.
   * @param priorStateRoot State root prior to the transaction.
   * @param stateProof Inclusion proof of the account in
   * the tree with root `priorStateRoot`.
   * @param transaction Transaction to check for fraud.
   */
  function validateExecutionErrorProof(
    bytes32 priorStateRoot,
    bytes memory stateProof,
    Tx.HardCreate memory transaction
  ) internal pure {
    (
      bool empty,
      uint256 accountIndex,
      bytes32[] memory siblings,
      Account.Account memory provenAccount
    ) = priorStateRoot.verifyAccountInState(stateProof);
    bool rejected = transaction.intermediateStateRoot == bytes32(0);

    if (accountIndex != transaction.accountIndex) {
      require(
        provenAccount.contractAddress == transaction.contractAddress && !rejected,
        "Wrong account proven."
      );
      return;
    }
    if (!empty) return;
    Account.Account memory account = Account.newAccount(
      transaction.contractAddress,
      transaction.signerAddress,
      transaction.value
    );
    require(
      account.updateAccount(accountIndex, siblings) !=
      transaction.intermediateStateRoot,
      "Transaction had valid output root."
    );
  }

  /**
   * @dev Validate a HardDeposit execution error proof.
   * @param priorStateRoot State root prior to the transaction.
   * @param stateProof Inclusion proof of the account in
   * the tree with root `priorStateRoot`.
   * @param transaction Transaction to check for fraud.
   */
  function validateExecutionErrorProof(
    bytes32 priorStateRoot,
    bytes memory stateProof,
    Tx.HardDeposit memory transaction
  ) internal pure {
    (
      bool empty,
      uint256 accountIndex,
      bytes32[] memory siblings,
      Account.Account memory account
    ) = priorStateRoot.verifyAccountInState(stateProof);
    /* Hard deposits can not be rejected. */
    if (transaction.intermediateStateRoot == bytes32(0)) return;
    require(transaction.accountIndex == accountIndex, "Wrong account proven.");
    if (empty) return;
    account.balance += transaction.value;
    require(
      account.updateAccount(accountIndex, siblings) !=
      transaction.intermediateStateRoot,
      "Transaction had valid output root."
    );
  }

  /**
   * @dev Validate a HardWithdrawal execution error proof.
   * @param priorStateRoot State root prior to the transaction.
   * @param stateProof Inclusion proof of the account in
   * the tree with root `priorStateRoot`.
   * @param transaction Transaction to check for fraud.
   */
  function validateExecutionErrorProof(
    bytes32 priorStateRoot,
    bytes memory stateProof,
    Tx.HardWithdrawal memory transaction
  ) internal pure {
    (
      bool empty,
      uint256 accountIndex,
      bytes32[] memory siblings,
      Account.Account memory account
    ) = priorStateRoot.verifyAccountInState(stateProof);
    require(accountIndex == transaction.accountIndex, "Wrong account proven.");
    bool rejected = transaction.intermediateStateRoot == bytes32(0);
    bool shouldReject = (
      empty ||
      account.balance < transaction.value ||
      transaction.withdrawalAddress != account.contractAddress
    );
    if (rejected != shouldReject) return;
    require(!rejected, "Transaction was correctly rejected.");
    account.balance -= transaction.value;
    require(
      account.updateAccount(accountIndex, siblings) !=
      transaction.intermediateStateRoot,
      "Transaction had valid output root."
    );
  }

  /**
   * @dev Validate a HardAddSigner execution error proof.
   * @param priorStateRoot State root prior to the transaction.
   * @param stateProof Inclusion proof of the account in
   * the tree with root `priorStateRoot`.
   * @param transaction Transaction to check for fraud.
   */
  function validateExecutionErrorProof(
    bytes32 priorStateRoot,
    bytes memory stateProof,
    Tx.HardAddSigner memory transaction
  ) internal pure {
    (
      bool empty,
      uint256 accountIndex,
      bytes32[] memory siblings,
      Account.Account memory account
    ) = priorStateRoot.verifyAccountInState(stateProof);
    require(accountIndex == transaction.accountIndex, "Wrong account proven.");
    bool rejected = transaction.intermediateStateRoot == bytes32(0);
    bool shouldReject = (
      empty ||
      (account.signers.length == 10) ||
      account.hasSigner(transaction.signingAddress)
    );
    if (rejected != shouldReject) return;
    require(!rejected, "Transaction was correctly rejected.");
    account.addSigner(transaction.signingAddress);
    require(
      account.updateAccount(accountIndex, siblings) !=
      transaction.intermediateStateRoot,
      "Transaction had valid output root."
    );
  }

  /**
   * @dev Validate a SoftWithdrawal execution error proof.
   * @param priorStateRoot State root prior to the transaction.
   * @param stateProof Inclusion proof of the account in
   * the tree with root `priorStateRoot`.
   * @param transaction Transaction to check for fraud.
   */
  function validateExecutionErrorProof(
    bytes32 priorStateRoot,
    bytes memory stateProof,
    Tx.SoftWithdrawal memory transaction
  ) internal pure {
    (
      , uint256 accountIndex,
      bytes32[] memory siblings,
      Account.Account memory account
    ) = priorStateRoot.verifyAccountInState(stateProof);
    require(accountIndex == transaction.accountIndex, "Wrong account proven.");
    if (
      account.balance < transaction.value ||
      account.nonce != transaction.nonce
    ) return;
    account.nonce += 1;
    account.balance -= transaction.value;
    require(
      account.updateAccount(accountIndex, siblings) !=
      transaction.intermediateStateRoot,
      "Transaction had valid output root."
    );
  }

  /**
   * @dev Validate a SoftCreate execution error proof.
   * @param priorStateRoot State root prior to the transaction.
   * @param senderProof Inclusion proof of the `from` account in
   * the tree with root `priorStateRoot`.
   * @param receiverProof Inclusion proof of the `to` account for the intermediate
   * state root after applying the change to the `from` account.
   * @param transaction Transaction to check for fraud.
   */
  function validateExecutionErrorProof(
    bytes32 priorStateRoot,
    bytes memory senderProof,
    bytes memory receiverProof,
    Tx.SoftCreate memory transaction
  ) internal pure {
    (
      , uint256 senderIndex,
      bytes32[] memory senderSiblings,
      Account.Account memory sender
    ) = priorStateRoot.verifyAccountInState(senderProof);
    require(senderIndex == transaction.fromIndex, "Proof must be of sender.");
    if (
      sender.balance < transaction.value ||
      sender.nonce != transaction.nonce
    ) return;
    sender.balance -= transaction.value;
    sender.nonce += 1;
    bytes32 intermediateRoot = sender.updateAccount(
      senderIndex, senderSiblings
    );

    (
      bool receiverEmpty,
      uint256 receiverIndex,
      bytes32[] memory receiverSiblings,
      Account.Account memory provenAccount
    ) = intermediateRoot.verifyAccountInState(receiverProof);
    if (receiverIndex != transaction.toIndex) {
      require(
        provenAccount.contractAddress == transaction.contractAddress,
        "Wrong account proven."
      );
      return;
    }
    if (!receiverEmpty) return;
    Account.Account memory receiver = Account.newAccount(
      transaction.contractAddress,
      transaction.signingAddress,
      transaction.value
    );
    require(
      receiver.updateAccount(receiverIndex, receiverSiblings) !=
      transaction.intermediateStateRoot,
      "Transaction had valid output root."
    );
  }

  /**
   * @dev Validate a SoftTransfer execution error proof.
   * @param priorStateRoot State root prior to the transaction.
   * @param senderProof Inclusion proof of the `from` account in
   * the tree with root `priorStateRoot`.
   * @param receiverProof Inclusion proof of the `to` account for the intermediate
   * state root after applying the change to the `from` account.
   * @param transaction Transaction to check for fraud.
   */
  function validateExecutionErrorProof(
    bytes32 priorStateRoot,
    bytes memory senderProof,
    bytes memory receiverProof,
    Tx.SoftTransfer memory transaction
  ) internal pure {
    (
      , uint256 senderIndex,
      bytes32[] memory senderSiblings,
      Account.Account memory sender
    ) = priorStateRoot.verifyAccountInState(senderProof);
    require(senderIndex == transaction.fromIndex, "Proof must be of sender.");
    if (
      sender.balance < transaction.value ||
      sender.nonce != transaction.nonce
    ) return;
    sender.balance -= transaction.value;
    sender.nonce += 1;
    bytes32 intermediateRoot = sender.updateAccount(
      senderIndex, senderSiblings
    );

    (
      bool receiverEmpty,
      uint256 receiverIndex,
      bytes32[] memory receiverSiblings,
      Account.Account memory receiver
    ) = intermediateRoot.verifyAccountInState(receiverProof);
    require(
      receiverIndex == transaction.toIndex, "Proof must be of receiver."
    );
    if (receiverEmpty) return;
    receiver.balance += transaction.value;
    require(
      receiver.updateAccount(receiverIndex, receiverSiblings) !=
      transaction.intermediateStateRoot,
      "Transaction had valid output root."
    );
  }

  /**
   * @dev Validate a SoftChangeSigner execution error proof.
   * @param priorStateRoot State root prior to the transaction.
   * @param stateProof Inclusion proof of the account in
   * the tree with root `priorStateRoot`.
   * @param transaction Transaction to check for fraud.
   */
  function validateExecutionErrorProof(
    bytes32 priorStateRoot,
    bytes memory stateProof,
    Tx.SoftChangeSigner memory transaction
  ) internal pure {
    (
      ,uint256 accountIndex,
      bytes32[] memory siblings,
      Account.Account memory account
    ) = priorStateRoot.verifyAccountInState(stateProof);
    require(accountIndex == transaction.fromIndex, "Wrong account proven.");
    if (account.nonce != transaction.nonce) return;
    if (transaction.modificationCategory == 0) {
      if (
        account.hasSigner(transaction.signingAddress) ||
        account.signers.length == 10
      ) return;
      account.addSigner(transaction.signingAddress);
    } else if (transaction.modificationCategory == 1) {
      if (!account.hasSigner(transaction.signingAddress)) return;
      account.removeSigner(transaction.signingAddress);
    } else return;
    account.nonce += 1;
    require(
      account.updateAccount(accountIndex, siblings) !=
      transaction.intermediateStateRoot,
      "Transaction had valid output root."
    );
  }

  /* solhint-disable code-complexity */
  function proveExecutionError(
    State.State storage state,
    Block.BlockHeader memory header,
    bytes memory transactionProof,
    bytes memory transaction,
    bytes memory stateProof1,
    bytes memory stateProof2
  ) internal {
    bytes32 previousStateRoot = state.validateTransactionStateProof(
      header, transactionProof, transaction
    );
    uint8 prefix = transaction.transactionPrefix();
    if (prefix == 0) {
      Tx.HardCreate memory _tx = Tx.decodeHardCreate(transaction);
      validateExecutionErrorProof(previousStateRoot, stateProof1, _tx);
    }
    else if (prefix == 1) {
      Tx.HardDeposit memory _tx = Tx.decodeHardDeposit(transaction);
      validateExecutionErrorProof(previousStateRoot, stateProof1, _tx);
    }
    else if (prefix == 2) {
      Tx.HardWithdrawal memory _tx = Tx.decodeHardWithdrawal(transaction);
      validateExecutionErrorProof(previousStateRoot, stateProof1, _tx);
    }
    else if (prefix == 3) {
      Tx.HardAddSigner memory _tx = Tx.decodeHardAddSigner(transaction);
      validateExecutionErrorProof(previousStateRoot, stateProof1, _tx);
    }
    else if (prefix == 4) {
      Tx.SoftWithdrawal memory _tx = Tx.decodeSoftWithdrawal(transaction);
      validateExecutionErrorProof(previousStateRoot, stateProof1, _tx);
    }
    else if (prefix == 5) {
      Tx.SoftCreate memory _tx = Tx.decodeSoftCreate(transaction);
      validateExecutionErrorProof(previousStateRoot, stateProof1, stateProof2, _tx);
    }
    else if (prefix == 6) {
      Tx.SoftTransfer memory _tx = Tx.decodeSoftTransfer(transaction);
      validateExecutionErrorProof(previousStateRoot, stateProof2, stateProof1, _tx);
    }
    else if (prefix == 7) {
      Tx.SoftChangeSigner memory _tx = Tx.decodeSoftChangeSigner(transaction);
      validateExecutionErrorProof(previousStateRoot, stateProof1, _tx);
    }
    state.revertBlock(header);
  }
  /* solhint-enable code-complexity */
}