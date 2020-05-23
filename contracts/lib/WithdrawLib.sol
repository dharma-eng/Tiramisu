pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { BlockLib as Block } from "./BlockLib.sol";
import { TransactionsLib as TX } from "./TransactionsLib.sol";


library WithdrawLib {
  struct GenericWithdrawal {
    address withdrawalAddress;
    uint56 value;
  }

  function checkHardWithdrawal(
    bytes32 lastRoot,
    uint256 ptr
  ) internal pure returns (bytes32 txRoot, GenericWithdrawal memory withdrawal) {
    assembly {
      txRoot := mload(add(ptr, 36))
      if iszero(eq(txRoot, lastRoot)) {
        let withdrawalAddress := shr(96, mload(add(ptr, 9)))
        let value := shr(200, mload(add(ptr, 29)))
        mstore(withdrawal, withdrawalAddress)
        mstore(add(withdrawal, 32), value)
      }
    }
  }

  function extractWithdrawals(
    Block.BlockHeader memory parent,
    bytes memory transactionsData
  ) internal pure returns (GenericWithdrawal[] memory withdrawals) {
    TX.TransactionsMetadata memory meta = TX.decodeTransactionsMetadata(transactionsData);
    withdrawals = new GenericWithdrawal[](
      meta.hardWithdrawCount + meta.softWithdrawCount
    );
    uint256 arrIndex;
    uint256 ptr;
    assembly { ptr := add(transactionsData, 48) }
    if (meta.hardWithdrawCount > 0) {
      bytes32 lastRoot;
      // For hard withdrawals, we need to make sure they weren't rejected by
      // comparing it to the previous state root.
      if (meta.hardCreateCount > 0 || meta.hardDepositCount > 0) {
        ptr += (meta.hardCreateCount * 88) + (meta.hardDepositCount * 48);
        assembly { lastRoot := mload(sub(ptr, 32)) }
      } else {
        lastRoot = parent.stateRoot;
      }
      for (uint256 i = 0; i < meta.hardWithdrawCount; i++) {
        GenericWithdrawal memory withdrawal;
        (lastRoot, withdrawal) = checkHardWithdrawal(lastRoot, ptr);
        if (
          withdrawal.withdrawalAddress != address(0)
        ) withdrawals[arrIndex++] = withdrawal;
        ptr += 68;
      }
    }

    ptr += (meta.hardAddSignerCount * 61);
    for (uint256 i = 0; i < meta.softWithdrawCount; i++) {
      GenericWithdrawal memory withdrawal;
      assembly {
        let withdrawalAddress := shr(96, mload(add(ptr, 7)))
        let value := shr(200, mload(add(ptr, 27)))
        mstore(withdrawal, withdrawalAddress)
        mstore(add(withdrawal, 32), value)
      }
      withdrawals[arrIndex++] = withdrawal;
      ptr += 131;
    }
    assembly { mstore(withdrawals, arrIndex) }
  }
}