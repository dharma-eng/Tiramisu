pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "./interfaces/AddressGetterInterface.sol";
import "./interfaces/IERC20.sol";


contract Configurable {
  /* <-- Storage --> */
  /**
   * @dev tokenDecimals
   * @notice Decimal places for the token on Tiramisu.
   * This value should not be mutable.
   */
  uint256 public tokenDecimals = 0;

  /**
    * @dev challengePeriod
    * @notice Number of blocks which must pass after a block is submitted before it can be confirmed.
    */
  uint256 public challengePeriod;

  /**
   * @dev commitmentBond
   * @notice Amount of tokens which must be locked on each block.
   * This is also the fraud proof reward.
   */
  uint256 public commitmentBond;

  /**
   * @dev version
   * @notice Current version number for the Tiramisu system.
   */
  uint256 public version;

  /**
   * @dev changeDelay
   * @notice Number of blocks which must pass between each modification
   */
  uint256 public changeDelay;

  /**
   * @dev addressHandler
   * @notice Contract which handles verification and derivation of L1 addresses.
   */
  AddressGetterInterface public addressHandler;

  /**
   * @dev tokenContract
   * @notice The address of the token contract used by Tiramisu.
   */
  IERC20 public tokenContract;

  /**
   * @dev _pendingChanges
   * @notice An internal mapping which has the value `true` for a pending change which has been recorded.
   */
  mapping(bytes32 => bool) internal _pendingChanges;

  /* <-- Data Structures --> */
  
  enum ConfigField {
    CHALLENGE_PERIOD,
    COMMITMENT_BOND,
    VERSION,
    CHANGE_DELAY,
    ADDRESS_HANDLER,
    TOKEN_CONTRACT
  }

  /**
   * @dev Data representing a requested modification to the configuration.
   */
  struct PendingModification {
    ConfigField field;
    uint256 value;
    uint256 readyAfter;
  }

  function _queueChange(ConfigField field, uint256 value) internal {
    PendingModification memory pending = PendingModification(
      field, value, block.number + changeDelay
    );

    bytes32 changeHash = keccak256(abi.encode(pending));
    require(!_pendingChanges[changeHash], "Change already queued.");
    _pendingChanges[changeHash] = true;
  }

  function _executeChange(PendingModification memory pending) internal {
    bytes32 changeHash = keccak256(abi.encode(pending));
    require(_pendingChanges[changeHash], "Change not queued.");
    require(pending.readyAfter < block.number, "Change not ready.");

    if (pending.field == ConfigField.CHALLENGE_PERIOD) {
      challengePeriod = pending.value;
    }

    else if (pending.field == ConfigField.COMMITMENT_BOND) commitmentBond = pending.value;
    else if (pending.field == ConfigField.VERSION) version = pending.value;
    else if (pending.field == ConfigField.CHANGE_DELAY) changeDelay = pending.value;
    else if (pending.field == ConfigField.ADDRESS_HANDLER) {
      address handler;
      assembly { handler := mload(add(pending, 0x20)) }
      addressHandler = AddressGetterInterface(handler);
    } else if (pending.field == ConfigField.TOKEN_CONTRACT) {
      address handler;
      assembly { handler := mload(add(pending, 0x20)) }
      tokenContract = IERC20(handler);
    }
    _pendingChanges[changeHash] = false;
  }
}