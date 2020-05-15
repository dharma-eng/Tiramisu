pragma solidity ^0.6.0;

import { BlockLib as Block } from "../lib/BlockLib.sol";
import { StateLib as State } from "../lib/StateLib.sol";
import { TransactionsLib as Tx } from "../lib/TransactionsLib.sol";
import { HardTransactionsLib as Hard } from "../lib/HardTransactionsLib.sol";
import { AccountLib as Account } from "../lib/AccountLib.sol";
import { MerkleProofLib as Merkle } from "../lib/merkle/MerkleProofLib.sol";
import { FraudUtilsLib as utils } from "./FraudUtilsLib.sol";
import { ExecutionErrorLib as ExecutionError } from "./ExecutionErrorLib.sol";


library ExecutionFraudProofs {
  using Block for bytes;
  using Block for Block.BlockHeader;
  using utils for State.State;
  using State for State.State;
  using Tx for bytes;
  using Account for Account.Account;

  function duplicateCreateError(
    State.State storage state,
    Block.BlockHeader memory badHeader,
    bytes memory transaction,
    uint256 transactionIndex,
    bytes32[] memory siblings,
    bytes memory previousStateProof,
    bytes memory stateProof
  ) internal {
    require(
      state.blockIsPending(badHeader.blockNumber, badHeader.blockHash()),
      "Block not pending."
    );
    uint8 prefix = transaction.transactionPrefix();
    require(prefix == 0 || prefix == 5, "Input not a create transaction.");
    require(
      Merkle.verify(
        badHeader.transactionsRoot, transaction, transactionIndex, siblings
      ),
      "Invalid transaction proof."
    );
    bytes32 previousStateRoot = state.transactionHadPreviousState(
      previousStateProof, badHeader, transactionIndex
    );
    (,,, Account.Account memory account) = Account.verifyAccountInState(
      previousStateRoot, stateProof
    );
    address contractAddress;
    if (prefix == 0) {
      Tx.HardCreate memory _tx = Tx.decodeHardCreate(transaction);
      require(_tx.intermediateStateRoot != bytes32(0), "Transaction not executed.");
      contractAddress = _tx.contractAddress;
    }
    else if (prefix == 5) {
      Tx.SoftCreate memory _tx = Tx.decodeSoftCreate(transaction);
      contractAddress = _tx.contractAddress;
    }
    require(
      account.contractAddress == contractAddress,
      "Proof does not match transaction."
    );
    return state.revertBlock(badHeader);
  }

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

    while(currentIndex <= meta.hardCreateCount) {
      assembly { if iszero(iszero(mload(add(pointer, 56)))) { creates := add(creates, 1) } }
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
   * Prove that the account index in a create transaction was not equal to the
   * state size of the previous block plus the sum of create
   * transactions executed previously in the same block.
   */
  function createdAccountIndexError(
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

  

  function validatePreState(
    State.State storage state,
    Block.BlockHeader memory badHeader,
    bytes memory transaction,
    uint256 transactionIndex,
    bytes32[] memory siblings,
    bytes memory previousStateProof
  ) internal returns (bytes32) {
    require(
      state.blockIsPending(badHeader.blockNumber, badHeader.blockHash()),
      "Block not pending."
    );
    require(
      Merkle.verify(
        badHeader.transactionsRoot, transaction, transactionIndex, siblings
      ),
      "Invalid transaction proof."
    );
    bytes32 previousStateRoot = state.transactionHadPreviousState(
      previousStateProof,
      badHeader,
      transactionIndex
    );
  }

  function proveExecutionError(
    State.State storage state,
    Block.BlockHeader memory badHeader,
    bytes memory transaction,
    uint256 transactionIndex,
    bytes32[] memory siblings,
    bytes memory previousStateProof,
    bytes memory stateProof
  ) internal {
    require(
      state.blockIsPending(badHeader.blockNumber, badHeader.blockHash()),
      "Block not pending."
    );
    require(
      Merkle.verify(
        badHeader.transactionsRoot, transaction, transactionIndex, siblings
      ),
      "Invalid transaction proof."
    );
    bytes32 previousStateRoot = state.transactionHadPreviousState(
      previousStateProof,
      badHeader,
      transactionIndex
    );
  }

  /**
   * Prove that the index of the created account was not empty prior to the transaction
   * or that the output state root was incorrect.
   */
  function createExecutionError(
    State.State storage state,
    Block.BlockHeader memory badHeader,
    bytes memory transaction,
    uint256 transactionIndex,
    bytes32[] memory siblings,
    bytes memory previousStateProof,
    bytes memory stateProof
  ) internal {
    require(
      state.blockIsPending(badHeader.blockNumber, badHeader.blockHash()),
      "Block not pending."
    );
    uint8 prefix = transaction.transactionPrefix();
    require(prefix == 0 || prefix == 5, "Input not a create transaction.");
    require(
      Merkle.verify(
        badHeader.transactionsRoot, transaction, transactionIndex, siblings
      ),
      "Invalid transaction proof."
    );
    (
      bool empty, uint256 provenIndex, bytes32[] memory accountSiblings,
    ) = utils.verifyPreviousAccountState(
      state,
      badHeader,
      transactionIndex,
      previousStateProof,
      stateProof
    );
    Account.Account memory account;
    bytes32 txOutputRoot;
    if (prefix == 0) {
      Tx.HardCreate memory _tx = Tx.decodeHardCreate(transaction);
      require(_tx.intermediateStateRoot != bytes32(0), "Transaction not executed.");
      require(provenIndex == _tx.accountIndex, "State proof invalid.");
      if (!empty) return state.revertBlock(badHeader);
      account = Account.newAccount(_tx.contractAddress, _tx.signerAddress, _tx.value);
      txOutputRoot = _tx.intermediateStateRoot;
    } else {
      Tx.SoftCreate memory _tx = Tx.decodeSoftCreate(transaction);
      require(provenIndex == _tx.toIndex, "State proof invalid.");
      if (!empty) return state.revertBlock(badHeader);
      account = Account.newAccount(_tx.contractAddress, _tx.signingAddress, _tx.value);
      txOutputRoot = _tx.intermediateStateRoot;
    }

    require(
      txOutputRoot !=
      Account.updateAccount(
        account, provenIndex, accountSiblings
      ),
      "Transaction had valid output root."
    );

    return state.revertBlock(badHeader);
  }

  /**
   * Prove that a soft transfer or hard deposit did not correctly increase
   * the balance of the target account, or that the transaction was not rejected
   * but the targeted account did not exist.
   */
  function transferExecutionError(
    State.State storage state,
    Block.BlockHeader memory badHeader,
    bytes memory transaction,
    uint256 transactionIndex,
    bytes32[] memory siblings,
    bytes memory previousStateProof,
    bytes memory stateProof
  ) internal {
    require(
      state.blockIsPending(badHeader.blockNumber, badHeader.blockHash()),
      "Block not pending."
    );
    uint8 prefix = transaction.transactionPrefix();
    require(prefix == 1 || prefix == 6, "Input not a transfer transaction.");
    require(
      Merkle.verify(
        badHeader.transactionsRoot, transaction, transactionIndex, siblings
      ),
      "Invalid transaction proof."
    );
    (
      bool empty, uint256 provenIndex,
      bytes32[] memory accountSiblings,
      Account.Account memory account
    ) = utils.verifyPreviousAccountState(
      state,
      badHeader,
      transactionIndex,
      previousStateProof,
      stateProof
    );
    bytes32 txOutputRoot;
    if (prefix == 1) {
      Tx.HardDeposit memory _tx = Tx.decodeHardDeposit(transaction);
      require(_tx.intermediateStateRoot != bytes32(0), "Transaction not executed.");
      require(provenIndex == _tx.accountIndex, "State proof invalid.");
      if (empty) return state.revertBlock(badHeader);
      txOutputRoot = _tx.intermediateStateRoot;
      account.balance += _tx.value;
    } else {
      Tx.SoftTransfer memory _tx = Tx.decodeSoftTransfer(transaction);
      require(provenIndex == _tx.toIndex, "State proof invalid.");
      if (empty) return state.revertBlock(badHeader);
      txOutputRoot = _tx.intermediateStateRoot;
      account.balance += _tx.value;
    }

    require(
      txOutputRoot !=
      Account.updateAccount(
        account, provenIndex, accountSiblings
      ),
      "Transaction had valid output root."
    );

    return state.revertBlock(badHeader);
  }

  /**
   * Prove that a soft transfer or hard deposit did not correctly increase
   * the balance of the target account, or that the transaction was not rejected
   * but the targeted account did not exist.
   */
  function withdrawalExecutionError(
    State.State storage state,
    Block.BlockHeader memory badHeader,
    bytes memory transaction,
    uint256 transactionIndex,
    bytes32[] memory siblings,
    bytes memory previousStateProof,
    bytes memory stateProof
  ) internal {
    require(
      state.blockIsPending(badHeader.blockNumber, badHeader.blockHash()),
      "Block not pending."
    );
    uint8 prefix = transaction.transactionPrefix();
    require(prefix == 2 || prefix == 4, "Input not a withdrawal transaction.");
    require(
      Merkle.verify(
        badHeader.transactionsRoot, transaction, transactionIndex, siblings
      ),
      "Invalid transaction proof."
    );
    (
      bool empty, uint256 provenIndex,
      bytes32[] memory accountSiblings,
      Account.Account memory account
    ) = utils.verifyPreviousAccountState(
      state,
      badHeader,
      transactionIndex,
      previousStateProof,
      stateProof
    );
    bytes32 txOutputRoot;
    /*
      If the account was empty or had an insufficient balance,
      the transaction should have been rejected.
    */
    if (prefix == 2) {
      Tx.HardWithdrawal memory _tx = Tx.decodeHardWithdrawal(transaction);
      require(provenIndex == _tx.accountIndex, "State proof invalid.");
      bool shouldReject = empty || (account.balance < _tx.value);
      bool didReject = _tx.intermediateStateRoot == bytes32(0);
      if (shouldReject != didReject) return state.revertBlock(badHeader);
      require(!didReject, "Transaction not executed.");
      txOutputRoot = _tx.intermediateStateRoot;
      account.balance -= _tx.value;
    } else {
      Tx.SoftWithdrawal memory _tx = Tx.decodeSoftWithdrawal(transaction);
      require(provenIndex == _tx.accountIndex, "State proof invalid.");
      if (empty || account.balance < _tx.value || account.nonce != _tx.nonce) return state.revertBlock(badHeader);
      txOutputRoot = _tx.intermediateStateRoot;
      account.balance -= _tx.value;
      account.nonce += 1;
    }

    require(
      txOutputRoot !=
      Account.updateAccount(
        account, provenIndex, accountSiblings
      ),
      "Transaction had valid output root."
    );

    return state.revertBlock(badHeader);
  }

  /**
   * Prove that a soft transfer or hard deposit did not correctly increase
   * the balance of the target account, or that the transaction was not rejected
   * but the targeted account did not exist.
   */
  function changeSignerExecutionError(
    State.State storage state,
    Block.BlockHeader memory badHeader,
    bytes memory transaction,
    uint256 transactionIndex,
    bytes32[] memory siblings,
    bytes memory previousStateProof,
    bytes memory stateProof
  ) internal {
    require(
      state.blockIsPending(badHeader.blockNumber, badHeader.blockHash()),
      "Block not pending."
    );
    uint8 prefix = transaction.transactionPrefix();
    require(prefix == 3 || prefix == 7, "Input not a change signer transaction.");
    require(
      Merkle.verify(
        badHeader.transactionsRoot, transaction, transactionIndex, siblings
      ),
      "Invalid transaction proof."
    );
    (
      bool empty, uint256 provenIndex,
      bytes32[] memory accountSiblings,
      Account.Account memory account
    ) = utils.verifyPreviousAccountState(
      state,
      badHeader,
      transactionIndex,
      previousStateProof,
      stateProof
    );
    bytes32 txOutputRoot;
    if (prefix == 3) {
      Tx.HardAddSigner memory _tx = Tx.decodeHardAddSigner(transaction);
      require(provenIndex == _tx.accountIndex, "State proof invalid.");
      bool shouldReject = empty || (account.signers.length == 10) || account.hasSigner(_tx.signingAddress);
      bool didReject = _tx.intermediateStateRoot == bytes32(0);
      if (shouldReject != didReject) return state.revertBlock(badHeader);
      require(!didReject, "Transaction not executed.");
      txOutputRoot = _tx.intermediateStateRoot;
      account.addSigner(_tx.signingAddress);
    } else {
      Tx.SoftChangeSigner memory _tx = Tx.decodeSoftChangeSigner(transaction);
      require(provenIndex == _tx.fromIndex, "State proof invalid.");
      
      if (empty || account.nonce != _tx.nonce) return state.revertBlock(badHeader);

      if (_tx.modificationCategory == 0) { /* 0 = add signer */
        if (account.hasSigner(_tx.signingAddress)) return state.revertBlock(badHeader);
        account.addSigner(_tx.signingAddress);
      } else { /* 1 = remove signer */
        if (!account.hasSigner(_tx.signingAddress)) return state.revertBlock(badHeader);
        account.removeSigner(_tx.signingAddress);
      }
      txOutputRoot = _tx.intermediateStateRoot;
      account.nonce += 1;
    }

    require(
      txOutputRoot !=
      Account.updateAccount(
        account, provenIndex, accountSiblings
      ),
      "Transaction had valid output root."
    );

    return state.revertBlock(badHeader);
  }
}