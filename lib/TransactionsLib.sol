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

  function decodeHardWithdrawal(bytes memory _tx) internal pure returns (HardWithdrawal memory ret) {
    assembly {
      /* <-- Decoding --> */
      let bodyPtr := add(_tx, 0x20)
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

  /* function doTest() external view {
    bytes memory data = hex"aaaaaaaaaabbbbbbbbccccccccccccccdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
    HardWithdrawal memory withdrawal = decodeHardWithdrawal(data);
    require(
      withdrawal.hardTransactionIndex == 0xaaaaaaaaaa &&
      withdrawal.accountIndex == 0xbbbbbbbb &&
      withdrawal.value == 0xcccccccccccccc &&
      withdrawal.intermediateStateRoot == 0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd,
      "Test Failure!"
    );
  } */
}