pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;


/**
 * @title HardTransactionsLib
 * @dev Contains the data structures and utility functions needed for the L1
 *  hard transaction types. These structures are essentially the hard
 * transaction input types, and do not represent the data structures recorded
 * in blocks.
 */
library HardTransactionsLib {
  /**
   * @dev Deposit
   * @notice Data structure representing a hard deposit or hard create
   * transaction.
   * @param contractAddress The primary address of an account on the L2 system,
   * which will generally represent a Dharma smart wallet.
   * @param signerAddress The initial signer address for the Dharma wallet. This
   * will only be used in hard create transactions. It is recorded due to the
   * uncertainty about the state of the sidechain.
   * @param value The DAI value for the deposit.
   */
  struct HardDeposit {
    address contractAddress;
    address signerAddress;
    uint56 value;
  }

  /**
   * @dev HardWithdrawal
   * @notice Data structure representing a hard withdrawal transaction.
   * @param accountIndex Index of the account on the L2 chain.
   * It is presumed that the user has access to this.
   * @param caller Address of the contract which initiated the withdrawal.
   * This is needed to check if the caller has approval once the transaction is
   * executed or rejected.
   * @param value Amount of dai to withdraw from the account.
   */
  struct HardWithdrawal {
    uint32 accountIndex;
    address caller;
    uint56 value;
  }

  /**
   * @dev HardAddSigner
   * @notice Data structure representing a hard 'add signer' transaction.
   * @param accountIndex Index of the account on the L2 chain.
   * It is presumed that the user has access to this.
   * @param caller Address of the contract which initiated the transaction.
   * This is needed to check if the caller has approval once the transaction is
   * executed or rejected.
   * @param signingAddress Address to add to the array of signer keys for the
   * account.
   */
  struct HardAddSigner {
    uint32 accountIndex;
    address caller;
    address signingAddress;
  }

  enum HardTransactionType { INVALID, DEPOSIT, WITHDRAWAL, ADD_SIGNER }

  function _checkTransactionType(
    bytes memory encodedTransaction
  ) internal pure returns (HardTransactionType) {
    if (encodedTransaction.length == 47) return HardTransactionType.DEPOSIT;
    if (encodedTransaction.length == 31) return HardTransactionType.WITHDRAWAL;
    if (encodedTransaction.length == 44) return HardTransactionType.ADD_SIGNER;
    return HardTransactionType.INVALID;
  }

  function _encode(
    HardDeposit memory transaction
  ) internal pure returns (bytes memory encodedTransaction) {
    /* Note, while the prefix 0 is used here, this struct actually handles both
       creates and deposits. */
    encodedTransaction = abi.encodePacked(
      uint8(0),
      transaction.contractAddress,
      transaction.signerAddress,
      transaction.value
    );
  }

  function _decodeHardDeposit(
    bytes memory data
  ) internal pure returns (HardDeposit memory hardDeposit) {
    assembly {
      // Skip length and prefix
      let ptr := add(data, 0x21)
      // contractAddress
      mstore(hardDeposit, shr(96, mload(ptr)))
      // signerAddress
      mstore(add(hardDeposit, 0x20), shr(96, mload(add(ptr, 20))))
      // value
      mstore(add(hardDeposit, 0x40), shr(200, mload(add(ptr, 40))))
    }
  }

  function _encode(
    HardWithdrawal memory transaction
  ) internal pure returns (bytes memory encodedTransaction) {
    encodedTransaction = abi.encodePacked(
      uint8(2),
      transaction.accountIndex,
      transaction.caller,
      transaction.value
    );
  }

  function _decodeHardWithdrawal(
    bytes memory data
  ) internal pure returns (HardWithdrawal memory hardWithdrawal) {
    assembly {
      // Skip length and prefix
      let ptr := add(data, 0x21)
      // accountIndex
      mstore(hardWithdrawal, shr(224, mload(ptr)))
      // caller
      mstore(add(hardWithdrawal, 0x20), shr(96, mload(add(ptr, 4))))
      // value
      mstore(add(hardWithdrawal, 0x40), shr(200, mload(add(ptr, 24))))
    }
  }

  function _encode(
    HardAddSigner memory transaction
  ) internal pure returns (bytes memory encodedTransaction) {
    encodedTransaction = abi.encodePacked(
      uint8(3),
      transaction.accountIndex,
      transaction.caller,
      transaction.signingAddress
    );
  }

  function _decodeHardAddSigner(
    bytes memory data
  ) internal pure returns (HardAddSigner memory hardAddSigner) {
    assembly {
      // Skip length and prefix
      let ptr := add(data, 0x21)
      // accountIndex
      mstore(hardAddSigner, shr(224, mload(ptr)))
      // caller
      mstore(add(hardAddSigner, 0x20), shr(96, mload(add(ptr, 4))))
      // signingAddress
      mstore(add(hardAddSigner, 0x40), shr(96, mload(add(ptr, 24))))
    }
  }
}