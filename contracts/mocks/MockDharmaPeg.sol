pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "../DharmaPeg.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IDharmaAddressGetter.sol";

contract MockDharmaPeg is DharmaPeg {
  constructor(address daiContract) public DharmaPeg(
    0, /* challenge period */
    50, /* commitment bond */
    0, /* version */
    0, /* config change delay */
    IDharmaAddressGetter(address(0)), /* dharma addressHandler */
    IERC20(daiContract)

  ) {}

  function mockDeposit(address contractAddress, address initialSignerAddress, uint56 value) external {
    _deposit(contractAddress, initialSignerAddress, value);
  }

  function clearTransactions() external {
    uint256 len = hardTransactions.length;
    for (uint256 i = 0; i < len; i++) delete hardTransactions[i];
    assembly {
      sstore(
        hardTransactions_slot,
        0
      )
    }
  }
}