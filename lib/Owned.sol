pragma solidity ^0.6.0;

contract Owned {
  address private _owner;

  constructor() public {
    _owner = msg.sender;
  }

  modifier onlyOwner {
    require(msg.sender == _owner, "Caller not the contract owner.");
    _;
  }

  function setOwner(address newOwner) external onlyOwner {
    _owner = newOwner;
  }
}