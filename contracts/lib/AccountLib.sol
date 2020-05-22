pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { MerkleProofLib as Merkle } from "./merkle/MerkleProofLib.sol";


library AccountLib {
  struct Account {
    address contractAddress;
    uint24 nonce;
    uint56 balance;
    address[] signers;
  }

  struct StateProof {
    bytes data;
    uint256 accountIndex;
    bytes32[] siblings;
  }

  /**
   * @dev newAccount
   * Creates a new account struct with the provided inputs.
   * @param contractAddress Address of the L1 account that owns the Tiramisu
   * account.
   * @param signerAddress Initial signing key for the account.
   * @param balance Initial balance of the account.
   */
  function newAccount(
    address contractAddress, address signerAddress, uint56 balance
  ) internal pure returns (Account memory) {
    address[] memory signers = new address[](1);
    signers[0] = signerAddress;
    return Account(contractAddress, 0, balance, signers);
  }

  /**
   * @dev updateAccount
   * Updates the leaf node in the state tree with the modified account
   * structure.
   * @param account Updated account object.
   * @param accountIndex Index of the account in the state tree.
   * @param siblings Merkle proof of the previous state of the account, which
   * is used to derive the new merkle root.
   * @return updatedRoot - Root hash of the merkle tree after applying the update.
   */
  function updateAccount(
    Account memory account, uint256 accountIndex, bytes32[] memory siblings
  ) internal pure returns (bytes32 updatedRoot) {
    return Merkle.update(encode(account), accountIndex, siblings);
  }

  /**
   * @dev verifyAccountInState
   * Verifies that an account exists in the provided state root and returns
   * the account struct, the index of the account in the tree, the merkle proof
   * (which is used for updates, where necessary) and whether the account was empty.
   * @notice The proof is ABI encoded due to ABIEncoderV2 errors.
   * @notice If the account does not exist (because the leaf at the index is null),
   * but a valid merkle proof is provided, this will return `empty=true` along with
   * a default account struct.
   * @param stateRoot Root hash of the state tree.
   * @param encoded Encoded StateProof object
   */
  function verifyAccountInState(
    bytes32 stateRoot, bytes memory encoded
  ) internal pure returns (
    bool empty, uint256 accountIndex, bytes32[] memory siblings, Account memory account
  ) {
    StateProof memory proof = abi.decode((encoded), (StateProof));
    accountIndex = proof.accountIndex;
    require(
      Merkle.verify(stateRoot, proof.data, accountIndex, proof.siblings),
      "Invalid state proof."
    );
    /*
      Check if the account is empty
      TODO: Replace empty leaf value with null buffer.
    */
    if (proof.data.length == 32) {
      bytes memory data = proof.data;
      assembly {
        empty := eq(mload(add(data, 32)), 0)
      }
    }

    if (empty) {
      address[] memory signers = new address[](0);
      account = Account(address(0), 0, 0, signers);
    } else {
      account = decode(proof.data);
    }
    siblings = proof.siblings;
  }

  /**
   * @dev hasSigner
   * Returns a boolean stating whether `signer` is in the `signers`
   * array of `account`.
   * @param account Account struct to check
   * @param signer Address to look for
   */
  function hasSigner(
    Account memory account, address signer
  ) internal pure returns (bool) {
    for (uint256 i = 0; i < account.signers.length; i++) {
      if (account.signers[i] == signer) {
        return true;
      }
    }

    return false;
  }

  /**
   * @dev addSigner
   * Adds an address to the account's array of signers.
   * @param account Account struct to add the signer to.
   * @param signer Signing address to add.
   */
  function addSigner(Account memory account, address signer) internal pure {
    address[] memory signers = new address[](account.signers.length + 1);
    uint256 i = 0;
    for (; i < account.signers.length; i++) signers[i] = account.signers[i];
    signers[i] = signer;
    account.signers = signers;
  }

  /**
   * @dev addSigner
   * Removes an address from the account's array of signers.
   * @notice This function creates a new array and reassigns the `signers`
   * field in the account struct, because Solidity does not allow resizing
   * arrays.
   * @param account Account struct to remove the signer from.
   * @param signer Signing address to remove.
   */
  function removeSigner(Account memory account, address signer) internal pure {
    address[] memory signers = new address[](account.signers.length - 1);
    uint256 i = 0;
    while (account.signers[i] != signer) i++;
    uint256 n = 0;
    for (; n < i; n++) signers[n] = account.signers[n];
    for (; n < signers.length; n++) signers[n] = account.signers[n+1];
    account.signers = signers;
  }

  /**
   * @dev encode
   * Encodes an account struct with packed ABI encoding.
   * @param account Account struct to encode.
   */
  function encode(
    Account memory account
  ) internal pure returns (bytes memory encodedAccount) {
    encodedAccount = abi.encodePacked(
      account.contractAddress,
      account.nonce,
      account.balance,
      encodeExtraPacked(account.signers)
    );
  }

  /**
   * @dev decode
   * Decodes an account that was encoded with packed ABI.
   * @param data Encoded account struct.
   */
  function decode(
    bytes memory data
  ) internal pure returns (Account memory account) {
    uint256 signersLength = (data.length - 30);
    require(signersLength % 20 == 0, "Invalid account encoding.");
    uint256 signersCount = signersLength / 20;

    address accountAddress;
    uint24 accountNonce;
    uint56 accountBalance;

    // Read and shift each parameter, skipping length encoding and prefix.
    assembly {
      accountAddress := shr(96, mload(add(data, 32)))
      accountNonce := shr(232, mload(add(data, 52)))
      accountBalance := shr(200, mload(add(data, 55)))
    }

    account.contractAddress = accountAddress;
    account.nonce = accountNonce;
    account.balance = accountBalance;
    account.signers = new address[](signersCount);

    address currentSigner;
    for (uint256 i = 0; i < signersCount; i++) {
      uint256 offset = 62 + (i * 20);
      // Read and shift each address at the proper offset in relation to data.
      assembly { currentSigner := shr(96, mload(add(data, offset))) }

      // Assign the signer to the corresponding location in the returned array.
      account.signers[i] = currentSigner;
    }
  }

  /**
   * @dev encodeExtraPacked
   * Tightly encodes an array of addresses.
   * @notice abi.encodePacked doesn't remove padding on dynamic array values
   * @param signers Array to pack.
   */
  function encodeExtraPacked(
    address[] memory signers
  ) internal pure returns (bytes memory packedSigners) {
    packedSigners = new bytes(signers.length * 20);

    // Iterate over each provided signer address.
    for (uint256 i = 0; i < signers.length; i++) {
      address signer = signers[i];
      uint256 offset = 32 + (i * 20);

      // Drop in each signer address at the calculated offset.
      assembly { mstore(add(packedSigners, offset), shl(96, signer)) }
    }
  }
}