pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { TransactionsLib as TX } from "../lib/TransactionsLib.sol";


contract PublicLibMock {
  function deriveTransactionsRoot(bytes memory transactionsData) public view returns (bytes32) {
    return TX.deriveTransactionsRoot(transactionsData);
  }
}