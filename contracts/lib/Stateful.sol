pragma solidity ^0.6.0;
import { StateLib as State } from "./StateLib.sol";


contract Stateful {
  State.State internal _state;
}