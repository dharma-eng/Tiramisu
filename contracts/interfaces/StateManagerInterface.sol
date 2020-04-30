pragma solidity ^0.6.0;


interface StateManagerInterface {
  /* <-- Events --> */
  event BlockSubmitted(uint32 blockNumber, bytes32 blockHash);
}