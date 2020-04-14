pragma solidity >=0.4.25;


contract Migrations {
  uint256 public last_completed_migration;

  function setCompleted(uint256 completed) public {
    last_completed_migration = completed;
  }

  function upgrade(address new_address) public {
    Migrations upgraded = Migrations(new_address);
    upgraded.setCompleted(last_completed_migration);
  }
}