pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { BlockLib as Block } from "./lib/BlockLib.sol";
import { IDharmaAddressGetter as DharmaAddress } from "./interfaces/IDharmaAddressGetter.sol";
import { HardTransactionsLib as HardTx } from "./lib/HardTransactionsLib.sol";
import { MerkleProofLib as Merkle } from "./lib/merkle/MerkleProofLib.sol";
import { TransactionsLib as TX } from "./lib/TransactionsLib.sol";
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
  
  /**
   * @dev executeWithdrawal
   * @notice Executes a withdrawal which exists in a confirmed block and replaces the leaf with a null value.
   * @param header Block header which contains the transaction.
   * @param transaction Encoded hard or soft withdrawal transaction.
   * @param transactionIndex Location of the transaction in the transactions tree for the block.
   * @param inclusionProof Array of sibling hashes for the transaction in the merkle tree.
   */
  function executeWithdrawal(
    Block.BlockHeader memory header,
    bytes memory transaction,
    uint256 transactionIndex,
    bytes32[] memory inclusionProof
  ) external {
    byte txPrefix = transaction[0];
    uint56 value;
    address receiver;
    /* Make sure the transaction is of the correct type and get the withdrawal parameters. */
    if (txPrefix == 0x02) {
      TX.HardWithdrawal memory withdrawal = TX.decodeHardWithdrawal(transaction);
      value = withdrawal.value;
      receiver = withdrawal.withdrawalAddress;
    } else if (txPrefix == 0x04) {
      SoftWithdrawal memory withdrawal = TX.decodeSoftWithdrawal(transaction);
      value = withdrawal.value;
      receiver = withdrawal.withdrawalAddress;
    } else revert("Transaction not of a withdrawal type.");
    /* Verify that the block is confirmed. */
    bytes32 blockHash = Block.blockHash(header);
    require(blockIsConfirmed(header.blockNumber, blockHash), "Block is not confirmed.");
    /* Verify the inclusion proof for the transaction and replace it with a null leaf. */
    (bool included, bytes32 newRoot) = Merkle.verifyAndUpdate(
      header.transactionsRoot,
      transaction,
      bytes(""),
      transactionIndex,
      inclusionProof
    );
    require(included, "Invalid inclusion proof.");
    /* Update header with new transactions root. */
    header.transactionsRoot = newRoot;
    /* Update block hash with new header. */
    blockHashes[header.blockNumber] = Block.blockHash(header);
    /* Transfer DAI to the recipient. */
    /* TODO - Add decimal conversion */
    tokenContract.transfer(receiver, value);
  }

  function submitBlock(Block.BlockInput calldata input) external onlyOwner {
    putPendingBlock(input);
  }

  function confirmBlock(Block.BlockHeader memory header) external {
    confirmBlock(header);
  }
}