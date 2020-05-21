pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { BlockLib as Block } from "./lib/BlockLib.sol";
import {
  IDharmaAddressGetter as DharmaAddress
} from "./interfaces/IDharmaAddressGetter.sol";
import { HardTransactionsLib as HardTx } from "./lib/HardTransactionsLib.sol";
import { MerkleProofLib as Merkle } from "./lib/merkle/MerkleProofLib.sol";
import { TransactionsLib as TX } from "./lib/TransactionsLib.sol";
import "./fraud-proofs/FraudProver.sol";
import "./lib/Owned.sol";
import "./StateManager.sol";
import "./interfaces/DharmaPegInterface.sol";


contract DharmaPeg is FraudProver, DharmaPegInterface, Owned, StateManager {
  using HardTx for bytes;
  using HardTx for HardTx.HardDeposit;
  using HardTx for HardTx.HardWithdrawal;
  using HardTx for HardTx.HardAddSigner;

  constructor(
    uint256 challengePeriod_,
    uint256 commitmentBond_,
    uint256 version_,
    uint256 changeDelay_,
    DharmaAddressHandler addressHandler_,
    IERC20 daiContract_
  ) public {
    challengePeriod = challengePeriod_;
    commitmentBond = commitmentBond_;
    version = version_;
    changeDelay = changeDelay_;
    addressHandler = addressHandler_;
    daiContract = daiContract_;
  }

  function deposit(uint56 value) external override {
    address contractAddress = addressHandler.getContractAddressForSigner(
      msg.sender
    );

    /* Note - need to add unit conversion for correct decimal values */
    require(
      daiContract.transferFrom(contractAddress, address(this), uint256(value)),
      "Transfer Failed."
    );

    _deposit(contractAddress, msg.sender, value);
  }

  function deposit(address signerAddress, uint56 value) external override {
    /* Need to figure out better logic for address mapping. */
    require(
      addressHandler.verifySignerHasAuthority(msg.sender, signerAddress),
      "Signer address does not match caller."
    );

    /* Note - need to add unit conversion for correct decimal values */
    require(
      daiContract.transferFrom(msg.sender, address(this), uint256(value)),
      "Transfer Failed."
    );

    _deposit(msg.sender, signerAddress, value);
  }

  function forceAddSigner(
    uint32 accountIndex, address signingAddress
  ) external override {
    HardTx.HardAddSigner memory hardTx = HardTx.HardAddSigner(
      accountIndex, msg.sender, signingAddress
    );

    _state.hardTransactions.push(hardTx.encode());

    emit NewHardTransaction(_state.hardTransactions.length);
  }

  function forceWithdrawal(
    uint32 accountIndex, uint56 value
  ) external override {
    HardTx.HardWithdrawal memory hardTx = HardTx.HardWithdrawal(
      accountIndex, msg.sender, value
    );

    _state.hardTransactions.push(hardTx.encode());

    emit NewHardTransaction(_state.hardTransactions.length);
  }

  function confirmBlock(Block.BlockHeader calldata header) external override {
    _confirmBlock(header);
  }

  function getHardTransactionsFrom(
    uint256 start, uint256 max
  ) external view override returns (bytes[] memory _hardTransactions) {
    uint256 len = _state.hardTransactions.length;
    uint256 stopAt = start + max;
    if (stopAt > len) stopAt = len;
    len = stopAt - start;
    _hardTransactions = new bytes[](len);
    for (uint256 i = 0; i < len; i++) {
      _hardTransactions[i] = _state.hardTransactions[i + start];
    }
  }

  function getBlockHash(
    uint256 height
  ) external view override returns (bytes32) {
    return _state.blockHashes[height];
  }

  function getBlockCount() external view override returns (uint256) {
    return _state.blockHashes.length;
  }

  function getConfirmedBlockCount() external view override returns (uint256) {
    return _state.confirmedBlocks;
  }

  /**
   * @dev executeWithdrawal
   * @notice Executes a withdrawal which exists in a confirmed block and
   * replaces the leaf with a null value.
   * @param header Block header which contains the transaction.
   * @param transaction Encoded hard or soft withdrawal transaction.
   * @param transactionIndex Location of the transaction in the transactions
   * tree for the block.
   * @param inclusionProof Array of sibling hashes for the transaction in the
   * merkle tree.
   */
  function executeWithdrawal(
    Block.BlockHeader memory header,
    bytes memory transaction,
    uint256 transactionIndex,
    bytes32[] memory inclusionProof
  ) public override {
    byte txPrefix = transaction[0];
    uint56 value;
    address receiver;
    /* Ensure transaction is the correct type and get withdrawal parameters. */
    if (txPrefix == 0x02) {
      TX.HardWithdrawal memory withdrawal = TX.decodeHardWithdrawal(transaction);
      value = withdrawal.value;
      receiver = withdrawal.withdrawalAddress;
    } else if (txPrefix == 0x04) {
      TX.SoftWithdrawal memory withdrawal = TX.decodeSoftWithdrawal(transaction);
      value = withdrawal.value;
      receiver = withdrawal.withdrawalAddress;
    } else revert("Transaction not of a withdrawal type.");
    /* Verify that the block is confirmed. */
    bytes32 blockHash = Block.blockHash(header);
    require(
      _state.blockIsConfirmed(header.blockNumber, blockHash),
      "Block is not confirmed."
    );

    /* Verify transaction's inclusion proof and replace it with a null leaf. */
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
    _state.blockHashes[header.blockNumber] = Block.blockHash(header);
    /* Transfer DAI to the recipient. */
    /* TODO - Add decimal conversion */
    daiContract.transfer(receiver, value);
  }

  function submitBlock(
    Block.BlockInput memory input
  ) public override onlyOwner {
    _putPendingBlock(input);
  }

  function _deposit(
    address contractAddress, address signerAddress, uint56 value
  ) internal {
    /* TODO - replace storage of full data with storage of a hash, and emit the
       data in the event */
    HardTx.HardDeposit memory hardDeposit = HardTx.HardDeposit(
      contractAddress, signerAddress, value
    );
    emit NewHardTransaction(_state.hardTransactions.length);
    _state.hardTransactions.push(hardDeposit.encode());
  }
}