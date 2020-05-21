pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "../DharmaPeg.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IDharmaAddressGetter.sol";

import {
  BlockErrorLib as BlockError
} from "../fraud-proofs/BlockErrorLib.sol";
import {
  TransactionErrorLib as TransactionError
} from "../fraud-proofs/TransactionErrorLib.sol";
import {
  FraudUtilsLib as FraudUtils
} from "../fraud-proofs/FraudUtilsLib.sol";
import { AccountLib as Account } from "../lib/AccountLib.sol";
import {
  ExecutionErrorLib as ExecutionError
} from "../fraud-proofs/ExecutionErrorLib.sol";


contract MockDharmaPeg is DharmaPeg {
  constructor(address daiContract) public DharmaPeg(
    0, /* challenge period */
    50, /* commitment bond */
    0, /* version */
    0, /* config change delay */
    IDharmaAddressGetter(address(0)), /* dharma addressHandler */
    IERC20(daiContract)
  ) /* solhint-disable no-empty-blocks */ {
  } /* solhint-enable no-empty-blocks */

  function mockDeposit(
    address contractAddress, address initialSignerAddress, uint56 value
  ) external {
    _deposit(contractAddress, initialSignerAddress, value);
  }

  function resetChain() external {
    delete _state.hardTransactions;
    delete _state.blockHashes;
    delete _state.confirmedBlocks;
  }

  function transactionHadPreviousState(
    bytes memory previousSource,
    Block.BlockHeader memory blockHeader,
    uint256 transactionIndex
  ) public view returns (bytes32) {
    return FraudUtils.transactionHadPreviousState(
      _state, previousSource, blockHeader, transactionIndex
    );
  }
}