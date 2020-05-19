pragma solidity ^0.6.0;

import { BlockLib as Block } from "../lib/BlockLib.sol";
import { StateLib as State } from "../lib/StateLib.sol";
import { TransactionsLib as Tx } from "../lib/TransactionsLib.sol";
import { HardTransactionsLib as Hard } from "../lib/HardTransactionsLib.sol";
import { AccountLib as Account } from "../lib/AccountLib.sol";
import { MerkleProofLib as Merkle } from "../lib/merkle/MerkleProofLib.sol";
import { FraudUtilsLib as utils } from "./FraudUtilsLib.sol";


library TransactionErrorLib {
  using Block for bytes;
  using Block for Block.BlockHeader;
  using State for State.State;
  using utils for State.State;
  using Tx for bytes;
  using Account for Account.Account;

  function proveHardCreateSourceError(
    bytes memory inputData,
    bytes memory outputData
  ) internal pure returns (bool) {
    /**
      Fraud conditions:
      - output tx size mismatch
      - prefix mismatch
      - output value does not match input value
      - output addresses do not match input addresses
    */
    if (
      outputData.length != 89 || inputData.transactionPrefix() != 0
    ) {
      return true;
    }
    Hard.HardDeposit memory input = Hard.decodeHardDeposit(inputData);
    Tx.HardCreate memory output = Tx.decodeHardCreate(outputData);
    if (
      output.contractAddress != input.contractAddress ||
      output.signerAddress != input.signerAddress ||
      output.value != input.value
    ) return true;
  }

  function proveHardDepositSourceError(
    State.State storage state,
    Block.BlockHeader memory badHeader,
    bytes memory inputData,
    bytes memory outputData,
    uint256 transactionIndex,
    bytes memory previousStateProof,
    bytes memory stateProof
  ) internal view returns (bool) {
    /**
      Fraud conditions:
      - output tx size mismatch
      - prefix mismatch
      - output value does not match input value
      - an account existed with the contract address from the input, but the index in the output does not match it
        -- tx can not be processed to target an empty account
      - the account with the index in the output was either empty or had a different contract address from the input
    */
    if (
      outputData.length != 49 || inputData.transactionPrefix() != 0
    ) return true;

    Hard.HardDeposit memory input = Hard.decodeHardDeposit(inputData);
    Tx.HardDeposit memory output = Tx.decodeHardDeposit(outputData);

    if (
      input.value != output.value
    ) return true;

    bytes32 previousStateRoot = state.transactionHadPreviousState(
      previousStateProof, badHeader, transactionIndex
    );

    (
      bool empty, uint256 accountIndex,, Account.Account memory account
    ) = Account.verifyAccountInState(previousStateRoot, stateProof);

    bool addressMatch = account.contractAddress == input.contractAddress;
    bool indexMatch = accountIndex == output.accountIndex;

    return (
      (indexMatch && (empty || !addressMatch)) ||
      (addressMatch && !indexMatch)
    );
  }

  function proveHardWithdrawSourceError(
    bytes memory inputData,
    bytes memory outputData
  ) internal pure returns (bool) {
    /**
      Fraud conditions:
      - output tx size mismatch
      - prefix mismatch
      - output value, account index or withdrawal address do not match input
    */
    if (
      outputData.length != 49 || inputData.transactionPrefix() != 2
    ) return true;

    Hard.HardWithdrawal memory input = Hard.decodeHardWithdrawal(inputData);
    Tx.HardWithdrawal memory output = Tx.decodeHardWithdrawal(outputData);

    if (
      input.accountIndex != output.accountIndex ||
      input.value != output.value ||
      input.caller != output.withdrawalAddress
    ) return true;
  }

  function proveHardAddSignerSourceError(
    State.State storage state,
    Block.BlockHeader memory badHeader,
    bytes memory inputData,
    bytes memory outputData,
    uint256 transactionIndex,
    bytes memory previousStateProof,
    bytes memory stateProof
  ) internal view returns (bool) {
    /**
      Fraud conditions:
      - output tx has unexpected size
      - output tx has unexpected prefix
      - output signing address doesn't match input value
    */
    if (
      outputData.length != 94 || inputData.transactionPrefix() != 3
    ) return true;

    Hard.HardAddSigner memory input = Hard.decodeHardAddSigner(inputData);
    Tx.HardAddSigner memory output = Tx.decodeHardAddSigner(outputData);

    if (
      input.accountIndex != output.accountIndex ||
      input.signingAddress != output.signingAddress
    ) return true;

    bytes32 previousStateRoot = state.transactionHadPreviousState(
      previousStateProof, badHeader, transactionIndex
    );

    (
      bool empty, uint256 accountIndex,, Account.Account memory account
    ) = Account.verifyAccountInState(previousStateRoot, stateProof);
    require(accountIndex == input.accountIndex, "Invalid state proof.");
    if (
      output.intermediateStateRoot != bytes32(0) &&
      (empty || account.contractAddress != input.caller)
    ) return true;
  }

  function proveHardTransactionSourceError(
    State.State storage state,
    Block.BlockHeader memory badHeader,
    bytes memory transaction,
    uint256 transactionIndex,
    bytes32[] memory siblings,
    bytes memory previousStateProof,
    bytes memory stateProof
  ) internal {
    /* Verify inputs */
    require(
      state.blockIsPending(badHeader.blockNumber, badHeader.blockHash()),
      "Block not pending."
    );

    uint8 prefix = transaction.transactionPrefix();
    require(prefix < 4, "Input not a hard transaction.");

    require(
      Merkle.verify(
        badHeader.transactionsRoot, transaction, transactionIndex, siblings
      ),
      "Invalid merkle proof."
    );

    // Retrieve hard tx index from 40-bit memory region after length and prefix.
    uint256 hardTransactionIndex;
    assembly { hardTransactionIndex := shr(216, mload(add(transaction, 33))) }

    if (hardTransactionIndex >= state.hardTransactions.length) {
      return state.revertBlock(badHeader);
    }

    bytes memory inputData = state.hardTransactions[hardTransactionIndex];
    bool hasError;
    if (prefix == 0) {
      hasError = proveHardCreateSourceError(inputData, transaction);
    } else if (prefix == 1) {
      hasError = proveHardDepositSourceError(
        state, badHeader, inputData, transaction, transactionIndex,
        previousStateProof, stateProof
      );
    } else if (prefix == 2) {
      hasError = proveHardWithdrawSourceError(inputData, transaction);
    } else {
      hasError = proveHardAddSignerSourceError(
        state, badHeader, inputData, transaction, transactionIndex,
        previousStateProof, stateProof
      );
    }

    require(hasError, "No error found in transaction source.");
    return state.revertBlock(badHeader);
  }

  function proveSignatureError(
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
    require(prefix >= 4, "Input not a soft transaction.");
    require(
      Merkle.verify(
        badHeader.transactionsRoot, transaction, transactionIndex, siblings
      ),
      "Invalid merkle proof."
    );
    address signer = transaction.recoverSignature();
    if (signer == address(0)) {
      return state.revertBlock(badHeader);
    }

    bytes32 previousStateRoot = state.transactionHadPreviousState(
      previousStateProof, badHeader, transactionIndex
    );
    (
      , uint256 accountIndex,, Account.Account memory account
    ) = Account.verifyAccountInState(previousStateRoot, stateProof);
    uint256 transactionAccountIndex;
    assembly {
      // Get account index memory location (skip length, prefix, and nonce).
      let accountIndexPointer := add(transaction, 36)

      // Retrieve the 32-bit account index from the located memory region.
      transactionAccountIndex := shr(224, mload(accountIndexPointer))
    }
    require(
      accountIndex == transactionAccountIndex,
      "Proven account does not match transaction."
    );
    require(
      !account.hasSigner(signer),
      "Not fraudulent — account includes signer."
    );
    return state.revertBlock(badHeader);
  }
}