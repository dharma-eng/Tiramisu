pragma solidity ^0.6.0;

library TransactionsLib {
  struct TransactionsMetadata {
    uint16 hardCreateCount;
    uint16 hardDepositCount;
    uint16 hardWithdrawCount;
    uint16 hardAddSignerCount;
    uint16 softWithdrawCount;
    uint16 softCreateCount;
    uint16 softTransferCount;
    uint16 softChangeSignerCount;
  }

  struct HardWithdrawal {
    uint40 hardTransactionIndex;
    uint32 accountIndex;
    uint56 value;
    bytes32 intermediateStateRoot;
  }

  struct SoftWithdrawal {
    uint32 accountIndex;
    address withdrawalAddress;
    uint24 nonce;
    uint56 value;
    uint8 sigV;
    bytes32 sigR;
    bytes32 sigS;
    bytes32 intermediateStateRoot;
  }

  function decodeHardWithdrawal(bytes memory _tx) internal pure returns (HardWithdrawal memory ret) {
    assembly {
      /* Add 33 bytes - 32 to skip the length field of the bytes var, 1 to skip the prefix */
      let bodyPtr := add(_tx, 0x21)
      // hardTransactionIndex: [no offset] [40 bits]  (load(0) >> 216)
      mstore(ret, shr(216, mload(bodyPtr)))
      // accountIndex: [offset 5 bytes] [32 bits]  (load(5) >> 224)
      mstore(add(ret, 0x20), shr(224, mload(add(bodyPtr, 5))))
      // value: [offset 9 bytes] [56 bits]  (load(9) >> 200)
      mstore(add(ret, 0x40), shr(200, mload(add(bodyPtr, 9))))
      // intermediateStateRoot: [offset 16 bytes] [256 bits] (load(16))
      mstore(add(ret, 0x60), mload(add(bodyPtr, 16)))
    }
  }

  function decodeSoftWithdrawal(bytes memory _tx) internal pure returns (SoftWithdrawal memory ret) {
    assembly {
      /* Add 33 bytes - 32 to skip the length field of the bytes var, 1 to skip the prefix */
      let bodyPtr := add(_tx, 0x21)
      // accountIndex: [no offset] [32 bits]  (load(0) >> 224)
      mstore(ret, shr(224, mload(bodyPtr)))

      // withdrawalAddress: [offset 4 bytes] [160 bits]  (load(0) >> 96)
      mstore(add(ret, 0x20), shr(96, mload(add(bodyPtr, 4))))
      
      // nonce: [offset 24 bytes] [24 bits]  (load(0) >> 232)
      mstore(add(ret, 0x40), shr(232, mload(add(bodyPtr, 24))))
      
      // value: [offset 27 bytes] [56 bits]  (load(0) >> 200)
      mstore(add(ret, 0x60), shr(200, mload(add(bodyPtr, 27))))
      
      // sigV: [offset 34 bytes] [8 bits]  (load(0) >> 248)
      mstore(add(ret, 0x80), shr(248, mload(add(bodyPtr, 34))))
      
      // sigR: [offset 35 bytes] [256 bits]  (load(35))
      mstore(add(ret, 0xa0), mload(add(bodyPtr, 35)))
      
      // sigS: [offset 67 bytes] [256 bits]  (load(67))
      mstore(add(ret, 0xc0), mload(add(bodyPtr, 67)))
      
      // intermediateStateRoot: [offset 99 bytes] [256 bits] (load(99))
      mstore(add(ret, 0xe0), mload(add(bodyPtr, 99)))
    }
  }

  /*
  function testDecodeHardWithdrawal() external view {
    bytes memory data = hex"02aaaaaaaaaabbbbbbbbccccccccccccccdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
    HardWithdrawal memory withdrawal = decodeHardWithdrawal(data);
    require(
      withdrawal.hardTransactionIndex == 0xaaaaaaaaaa &&
      withdrawal.accountIndex == 0xbbbbbbbb &&
      withdrawal.value == 0xcccccccccccccc &&
      withdrawal.intermediateStateRoot == 0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd,
      "Test Failure!"
    );
  }

  function testDecodeSoftWithdrawal() external view {
    bytes memory data hex"040000000011111111111111111111111111111111111111112222223333333333333344555555555555555555555555555555555555555555555555555555555555555566666666666666666666666666666666666666666666666666666666666666667777777777777777777777777777777777777777777777777777777777777777";
    SoftWithdrawal memory withdrawal = decodeSoftWithdrawal(data);
    require(
      withdrawal.accountIndex == 0x00000000 &&
      withdrawal.withdrawalAddress == 0x1111111111111111111111111111111111111111 &&
      withdrawal.nonce == 0x222222 &&
      withdrawal.value == 0x33333333333333 &&
      withdrawal.sigV == 0x44 &&
      withdrawal.sigR == 0x5555555555555555555555555555555555555555555555555555555555555555 &&
      withdrawal.sigS == 0x6666666666666666666666666666666666666666666666666666666666666666 &&
      withdrawal.intermediateStateRoot == 0x7777777777777777777777777777777777777777777777777777777777777777,
      "Test Failure!"
    );
  }
  */
}