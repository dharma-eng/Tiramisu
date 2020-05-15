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

  function addSigner(Account memory account, address signer) internal pure {
    address[] memory signers = new address[](account.signers.length + 1);
    uint256 i = 0;
    for (; i < account.signers.length; i++) signers[i] = account.signers[i];
    signers[i] = signer;
    account.signers = signers;
  }

  function removeSigner(Account memory account, address signer) internal pure {
    address[] memory signers = new address[](account.signers.length - 1);
    uint256 i = 0;
    while (account.signers[i] != signer) i++;
    uint256 n = 0;
    for (; n < i; n++) signers[n] = account.signers[n];
    for (; n < signers.length; n++) signers[n] = account.signers[n+1];
    account.signers = signers;
  }

  function encode(
    Account memory account
  ) internal pure returns (bytes memory ret) {
    uint256 len = account.signers.length;
    ret = new bytes(30 + len * 20);
    assembly {
      mstore(add(ret, 32), shl(96, mload(account)))
      mstore(add(ret, 52), shl(232, mload(add(account, 0x20))))
      mstore(add(ret, 55), shl(200, mload(add(account, 0x40))))
      let writePtr := add(ret, 62)
      let inPtr := add(mload(add(account, 96)), 32)
      for { let i := 0 } lt(i, len) { i := add(i, 1) } {
        mstore(writePtr, shl(96, mload(inPtr)))
        writePtr := add(writePtr, 20)
        inPtr := add(inPtr, 32)
      }
    }
  }

  function decode(
    bytes memory data
  ) internal pure returns (Account memory account) {
    uint256 remainder = (data.length - 30);
    if (remainder % 20 != 0) revert("Invalid account encoding.");
    uint256 signerCount = remainder / 20;
    account.signers = new address[](signerCount);
    assembly {
      let inPtr := add(data, 32)
      mstore(account, shr(96, mload(inPtr)))
      mstore(add(account, 32), shr(232, mload(add(inPtr, 20))))
      mstore(add(account, 64), shr(200, mload(add(inPtr, 23))))
      let writePtr := add(mload(add(account, 96)), 32)
      inPtr := add(inPtr, 30)
      for { let i := 0 } lt(i, signerCount) { i := add(i, 1) } {
        mstore(writePtr, shr(96, mload(inPtr)))
        writePtr := add(writePtr, 32)
        inPtr := add(inPtr, 20)
      }
    }
  }
}