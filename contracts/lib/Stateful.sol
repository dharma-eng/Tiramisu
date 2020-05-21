pragma solidity ^0.6.0;
import { StateLib as State } from "./StateLib.sol";

abstract contract Stateful {
  State.State internal _state;
}