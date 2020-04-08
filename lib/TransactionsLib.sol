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

  
}