pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { StateLib as State } from "../lib/StateLib.sol";
import { BlockLib as Block } from "../lib/BlockLib.sol";
import {
  BlockErrorLib as BlockError
} from "./BlockErrorLib.sol";
import {
  TransactionErrorLib as TransactionError
} from "./TransactionErrorLib.sol";
import {
  FraudUtilsLib as FraudUtils
} from "./FraudUtilsLib.sol";
import { AccountLib as Account } from "../lib/AccountLib.sol";
import {
  ExecutionErrorLib as ExecutionError
} from "./ExecutionErrorLib.sol";

import "../lib/Stateful.sol";


contract FraudProver is Stateful {
  /* <-- Block Errors --> */

  function proveStateRootError(
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) public {
    BlockError.proveStateRootError(
      _state, badHeader, transactionsData
    );
  }

  function proveStateSizeError(
    Block.BlockHeader memory previousHeader,
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) public {
    BlockError.proveStateSizeError(
      _state, previousHeader, badHeader, transactionsData
    );
  }

  function proveTransactionsRootError(
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) public {
    BlockError.proveTransactionsRootError(
      _state, badHeader, transactionsData
    );
  }

  function proveHardTransactionsCountError(
    Block.BlockHeader memory previousHeader,
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) public {
    BlockError.proveHardTransactionsCountError(
      _state, previousHeader, badHeader, transactionsData
    );
  }

  function proveHardTransactionsRangeError(
    Block.BlockHeader memory previousHeader,
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) public {
    BlockError.proveHardTransactionsRangeError(
      _state, previousHeader, badHeader, transactionsData
    );
  }

  function proveHardTransactionsOrderError(
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) public {
    BlockError.proveHardTransactionsOrderError(
      _state,
      badHeader,
      transactionsData
    );
  }

  function proveTransactionsDataLengthError(
    Block.BlockHeader memory badHeader,
    bytes memory transactionsData
  ) public {
    BlockError.proveTransactionsDataLengthError(
      _state,
      badHeader,
      transactionsData
    );
  }

  /* <-- Transaction Errors --> */

  function proveHardTransactionSourceError(
    Block.BlockHeader memory badHeader,
    bytes memory transaction,
    uint256 transactionIndex,
    bytes32[] memory siblings,
    bytes memory previousStateProof,
    bytes memory stateProof
  ) public {
    TransactionError.proveHardTransactionSourceError(
      _state,
      badHeader,
      transaction,
      transactionIndex,
      siblings,
      previousStateProof,
      stateProof
    );
  }

  function proveSignatureError(
    Block.BlockHeader memory badHeader,
    bytes memory transaction,
    uint256 transactionIndex,
    bytes32[] memory siblings,
    bytes memory previousStateProof,
    bytes memory stateProof
  ) public {
    TransactionError.proveSignatureError(
      _state,
      badHeader,
      transaction,
      transactionIndex,
      siblings,
      previousStateProof,
      stateProof
    );
  }

  /* <-- Execution Errors --> */

  function proveCreateIndexError(
    Block.BlockHeader memory previousHeader,
    Block.BlockHeader memory badHeader,
    uint256 transactionIndex,
    bytes memory transactionsData
  ) public {
    ExecutionError.proveCreateIndexError(
      _state,
      previousHeader,
      badHeader,
      transactionIndex,
      transactionsData
    );
  }

  function proveExecutionError(
    Block.BlockHeader memory header,
    bytes memory transactionProof,
    bytes memory transaction,
    bytes memory stateProof1,
    bytes memory stateProof2
  ) public {
    ExecutionError.proveExecutionError(
      _state,
      header,
      transactionProof,
      transaction,
      stateProof1,
      stateProof2
    );
  }
}