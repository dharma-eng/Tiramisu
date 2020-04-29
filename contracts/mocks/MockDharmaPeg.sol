pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "../DharmaPeg.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IDharmaAddressGetter.sol";
import { HeaderFraudProofs as HeaderFraud } from "../fraud-proofs/HeaderFraudProofs.sol";
import { TransactionFraudProofs as TransactionFraud } from '../fraud-proofs/TransactionFraudProofs.sol';
import { FraudUtilsLib as FraudUtils } from '../fraud-proofs/FraudUtilsLib.sol';
import { AccountLib as Account } from '../lib/AccountLib.sol';


contract MockDharmaPeg is DharmaPeg {
  constructor(address daiContract) public DharmaPeg(
    0, /* challenge period */
    50, /* commitment bond */
    0, /* version */
    0, /* config change delay */
    IDharmaAddressGetter(address(0)), /* dharma addressHandler */
    IERC20(daiContract)
  ) {}

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

  /* Fraud Proofs */
  function transactionHadPreviousState(
    bytes memory previousSource,
    Block.BlockHeader memory blockHeader,
    uint256 transactionIndex
  ) public view returns(bytes32) {
    return FraudUtils.transactionHadPreviousState(_state, previousSource, blockHeader, transactionIndex);
  }

  function proveStateSizeError(
    Block.BlockHeader memory previousHeader,
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) public {
    HeaderFraud.proveStateSizeError(_state, previousHeader, badHeader, transactionsData);
  }

  function proveTransactionsRootError(
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) public {
    HeaderFraud.proveTransactionsRootError(_state, badHeader, transactionsData);
  }

  function proveHardTransactionRangeError(
    Block.BlockHeader memory previousHeader,
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) public {
    HeaderFraud.proveHardTransactionRangeError(_state, previousHeader, badHeader, transactionsData);
  }

  function proveHardTransactionSourceError(
    Block.BlockHeader memory badHeader,
    bytes memory transaction,
    uint256 transactionIndex,
    bytes32[] memory siblings,
    bytes memory previousStateProof,
    bytes memory stateProof
  ) public {
    TransactionFraud.proveHardTransactionSourceError(
      _state,
      badHeader,
      transaction,
      transactionIndex,
      siblings,
      previousStateProof,
      stateProof
    );
  }
}