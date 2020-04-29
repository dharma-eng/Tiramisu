pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { IDharmaAddressGetter as DharmaAddressHandler } from "./interfaces/IDharmaAddressGetter.sol";
import "./interfaces/IERC20.sol";


contract Configurable {
  /* <-- Storage --> */
  /**
   * @dev daiDecimals
   * @notice Decimal places for DAI on the L2.
   * This value should not be mutable.
   */
  uint256 public daiDecimals = 0;

  /**
    * @dev challengePeriod
    * @notice Number of blocks which must pass after a block is submitted before it can be confirmed.
    */
  uint256 public challengePeriod;

  /**
   * @dev commitmentBond
   * @notice Amount of DAI which must be locked on each block.
   * This is also the fraud proof reward.
   */
  uint256 public commitmentBond;

  /**
   * @dev version
   * @notice Current version number for the Dharma L2 system.
   */
  uint256 public version;

  /**
   * @dev changeDelay
   * @notice Number of blocks which must pass between each modification
   */
  uint256 public changeDelay;

  /**
   * @dev addressHandler
   * @notice Contract which handles verification and derivation of Dharma smart contract addresses.
   */
  DharmaAddressHandler public addressHandler;

  /**
   * @dev daiContract
   * @notice Dharma Dai contract.
   */
  IERC20 public daiContract;

  /**
   * @dev pendingChanges
   * @notice A mapping which has the value `true` for a pending change which has been recorded.
   */
  mapping(bytes32 => bool) internal pendingChanges;

  /* <-- Data Structures --> */
  /**
   * @dev ConfigField
   * @notice Used as a selector for config modification.
   */
  enum ConfigField {
    CHALLENGE_PERIOD,
    COMMITMENT_BOND,
    VERSION,
    CHANGE_DELAY,
    ADDRESS_HANDLER,
    DAI_CONTRACT
  }

  /**
   * @dev PendingModification
   * @notice Data representing a requested modification to the configuration.
   */
  struct PendingModification {
    ConfigField field;
    uint256 value;
    uint256 readyAfter;
  }

  function queueChange(ConfigField field, uint256 value) internal {
    PendingModification memory pending = PendingModification(field, value, block.number + changeDelay);
    bytes32 changeHash = keccak256(abi.encode(pending));
    require(!pendingChanges[changeHash], "Change already queued.");
    pendingChanges[changeHash] = true;
  }

  function executeChange(PendingModification memory pending) internal {
    bytes32 changeHash = keccak256(abi.encode(pending));
    require(pendingChanges[changeHash], "Change not queued.");
    require(pending.readyAfter < block.number, "Change not ready.");
    if (pending.field == ConfigField.CHALLENGE_PERIOD) challengePeriod = pending.value;
    else if (pending.field == ConfigField.COMMITMENT_BOND) commitmentBond = pending.value;
    else if (pending.field == ConfigField.VERSION) version = pending.value;
    else if (pending.field == ConfigField.CHANGE_DELAY) changeDelay = pending.value;
    else if (pending.field == ConfigField.ADDRESS_HANDLER) {
      address handler;
      assembly { handler := mload(add(pending, 0x20)) }
      addressHandler = DharmaAddressHandler(handler);
    } else if (pending.field == ConfigField.DAI_CONTRACT) {
      address handler;
      assembly { handler := mload(add(pending, 0x20)) }
      daiContract = IERC20(handler);
    }
    pendingChanges[changeHash] = false;
  }
}