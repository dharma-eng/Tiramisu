pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { BlockLib as Block } from "./lib/BlockLib.sol";
import { IDharmaAddressGetter as DharmaAddress } from "./interfaces/IDharmaAddressGetter.sol";
import { HardTransactionsLib as HardTx } from "./lib/HardTransactionsLib.sol";
import "./lib/Owned.sol";
import "./StateManager.sol";

contract DharmaPeg is Owned, StateManager {
  bytes[] public hardTransactions;

  function _deposit(address contractAddress, address signerAddress, uint256 value) {
    uint32 value;
    assembly {
      let mask := 0x00000000000000000000000000000000000000000000000000ffffffffffffff
      value := and(mask, _value)
    }
    /* Note - need to add unit conversion for correct decimal values */
    require(daiContract.transferFrom(contractAddress, address(this), value), "Transfer Failed.");
    /* TODO - replace storage of full data with storage of a hash, and emit the data in the event */
    HardTx.HardDeposit memory deposit = HardTx.HardDeposit(msg.sender, signerAddress, value);
    emit HardTx.NewHardTransaction(hardTransactions.length);
    hardTransactions.push(abi.encode(deposit));
  }

  function deposit(uint256 value) external {
    address contractAddress = addressHandler.getContractAddressForSigner(msg.sender);
    _deposit(contractAddress, msg.sender, value);
  }

  function deposit(address signerAddress, uint256 _value) external {
    /* Need to figure out better logic for address mapping. */
    require(
      addressHandler.verifySignerHasAuthority(msg.sender, signerAddress),
      "Signer address does not match caller."
    );
    _deposit(contractAddress, signerAddress, value);
  }

  function forceAddSigner(uint32 accountIndex, address signingAddress) external {
    HardTx.HardAddSigner memory hardTx = HardTx.HardAddSigner(accountIndex, msg.sender, signingAddress);
    emit HardTx.NewHardTransaction(hardTransactions.length);
    hardTransactions.push(abi.encode(hardTx));
  }

  function forceWithdrawal(uint32 accountIndex, uint56 value) external {
    HardTx.HardWithdrawal memory hardTx = HardTx.HardWithdrawal(accountIndex, msg.sender, value);
    emit HardTx.NewHardTransaction(hardTransactions.length);
    hardTransactions.push(abi.encode(hardTx));
  }

  function submitBlock(Block.BlockInput calldata input) external onlyOwner {
    putPendingBlock(input);
  }

  function confirmBlock(Block.BlockHeader memory header) external {
    confirmBlock(header);
  }
}