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

  function newAccount(
    address contractAddress, address signerAddress, uint56 balance
  ) internal pure returns (Account memory) {
    address[] memory signers = new address[](1);
    signers[0] = signerAddress;
    return Account(contractAddress, 0, balance, signers);
  }

  function updateAccount(
    Account memory account, uint256 accountIndex, bytes32[] memory siblings
  ) internal pure returns (bytes32 updatedRoot) {
    return Merkle.update(encode(account), accountIndex, siblings);
  }

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

    empty = proof.data.length == 0;
    account = decode(proof.data);
    if (empty) {
      address[] memory signers = new address[](0);
      account = Account(address(0), 0, 0, signers);
    } else {
      account = decode(proof.data);
    }
    siblings = proof.siblings;
  }

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

  // Note: abi.encodePacked doesn't remove padding on dynamic array values.
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