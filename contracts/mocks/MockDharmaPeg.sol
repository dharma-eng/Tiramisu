pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "../DharmaPeg.sol";
import "./DaiMock.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IDharmaAddressGetter.sol";

contract MockDharmaPeg is DharmaPeg {
  constructor() public DharmaPeg(
    0, /* challenge period */
    50, /* commitment bond */
    0, /* version */
    0, /* config change delay */
    IDharmaAddressGetter(address(0)), /* dharma addressHandler */
    IERC20(address(new DaiMock(
      5000, /* total supply */
      string("DharmaDAI"), /* token name */
      string("DDAI")
    )))
  ) {}

  function mockDeposit(address contractAddress, address initialSignerAddress, uint56 value) external {
    _deposit(contractAddress, initialSignerAddress, value);
  }
}