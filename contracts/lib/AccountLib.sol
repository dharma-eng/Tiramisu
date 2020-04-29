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

  function _verifyAccountInState(
    bytes32 stateRoot,
    StateProof memory proof
  ) internal pure returns (bool valid, bool empty, Account memory account) {
    valid = Merkle._verify(
      stateRoot,
      proof.data,
      // (account.contractAddress == address(0)) ? bytes("") : encode(proof.data),
      proof.accountIndex,
      proof.siblings
    );
    empty = proof.data.length == 0;
    if (empty) {
      address[] memory signers = new address[](0);
      account = Account(address(0), 0, 0, signers);
    } else {
      account = _decode(proof.data);
    }
  }

  function _hasSigner(
    Account memory account, address signer
  ) internal pure returns (bool) {
    for (uint256 i = 0; i < account.signers.length; i++) {
      if (account.signers[i] == signer) {
        return true;
      }
    }

    return false;
  }

  function _encode(
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

  function _decode(
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