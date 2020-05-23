pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { BlockLib as Block } from "./lib/BlockLib.sol";
import { HardTransactionsLib as HardTx } from "./lib/HardTransactionsLib.sol";
import { MerkleProofLib as Merkle } from "./lib/merkle/MerkleProofLib.sol";
import { TransactionsLib as TX } from "./lib/TransactionsLib.sol";
import "./interfaces/AddressGetterInterface.sol";
import "./fraud-proofs/FraudProver.sol";
import "./lib/Owned.sol";
import "./StateManager.sol";
import "./interfaces/TiramisuInterface.sol";
import { WithdrawLib as WD } from "./lib/WithdrawLib.sol";

/**
 * @title Tiramisu
 * @dev This contract interfaces between Ethereum and a Tiramisu blockchain.
 * It tracks the history of the Tiramisu chain, is the sole arbiter of block
 * validity and tracks all tokens managed by the Tiramisu chain.
 * New blocks on the sidechain are submitted to this contract and recorded as
 * pending for a period of time called the confirmation period, which is defined
 * in Configurable.sol, during which anyone can audit the block for errors.
 *
 * This implements functions which allow accounts on Ethereum to record "hard"
 * transactions which the Tiramisu chain must execute.
 *
 * If submitted blocks are invalid, anyone may submit a fraud proof to this
 * contract to prove that the block contains some error, which will cause the
 * block to be reverted. If fraud is proven, the operator will be penalized and
 * the prover will be rewarded.
 */
contract Tiramisu is FraudProver, TiramisuInterface, Owned, StateManager {
  using HardTx for bytes;
  using HardTx for HardTx.HardDeposit;
  using HardTx for HardTx.HardWithdrawal;
  using HardTx for HardTx.HardAddSigner;

  constructor(
    uint256 challengePeriod_,
    uint256 commitmentBond_,
    uint256 version_,
    uint256 changeDelay_,
    AddressGetterInterface addressHandler_,
    IERC20 tokenContract_
  ) public {
    challengePeriod = challengePeriod_;
    commitmentBond = commitmentBond_;
    version = version_;
    changeDelay = changeDelay_;
    addressHandler = addressHandler_;
    tokenContract = tokenContract_;
  }

  /**
   * @dev Creates a hard deposit/hard create using the caller's address
   * as both the account address and initial signing key.
   * @param value Amount of tokens to deposit.
   */
  function deposit(uint56 value) external override {
    address contractAddress = addressHandler.getContractAddressForSigner(
      msg.sender
    );

    /* Note - need to add unit conversion for correct decimal values */
    require(
      tokenContract.transferFrom(
        contractAddress, address(this), uint256(value)
      ),
      "Transfer Failed."
    );

    _deposit(contractAddress, msg.sender, value);
  }

  /**
   * @dev deposit
   * Creates a hard deposit/hard create using the caller's address as the
   * account address and the address provided as the initial signing key.
   * @notice The contract address can not be provided as an argument,
   * as that would make it possible to claim an account that the caller
   * does not own.
   * @param signerAddress Initial signing key for the account.
   * @param value Amount of tokens to deposit.
   */
  function deposit(address signerAddress, uint56 value) external override {
    /* Need to figure out better logic for address mapping. */
    require(
      addressHandler.verifySignerHasAuthority(msg.sender, signerAddress),
      "Signer address does not match caller."
    );

    /* Note - need to add unit conversion for correct decimal values */
    require(
      tokenContract.transferFrom(msg.sender, address(this), uint256(value)),
      "Transfer Failed."
    );

    _deposit(msg.sender, signerAddress, value);
  }

  /**
   * @dev forceAddSigner
   * Creates a HardAddSigner transaction which, if the caller is the owner
   * of the account specified, will add the provided signer address to the
   * account's list of signer.
   * @param accountIndex Index of the account to add the signer to.
   * @param signingAddress Address to add as a new signing key.
   */
  function forceAddSigner(
    uint32 accountIndex, address signingAddress
  ) external override {
    HardTx.HardAddSigner memory hardTx = HardTx.HardAddSigner(
      accountIndex, msg.sender, signingAddress
    );

    _state.hardTransactions.push(hardTx.encode());

    emit NewHardTransaction(_state.hardTransactions.length);
  }

  /**
   * @dev forceWithdrawal
   * Creates a HardWithdrawal transaction which, if the caller is the
   * owner of the specified account, will withdraw the amount of tokens
   * specified to the L1.
   * @param accountIndex Index of the account to withdraw from.
   * @param value Amount of tokens to withdraw.
   */
  function forceWithdrawal(
    uint32 accountIndex, uint56 value
  ) external override {
    HardTx.HardWithdrawal memory hardTx = HardTx.HardWithdrawal(
      accountIndex, msg.sender, value
    );

    _state.hardTransactions.push(hardTx.encode());

    emit NewHardTransaction(_state.hardTransactions.length);
  }

  /**
   * @dev confirmBlock
   * Confirms a pending block if it has passed the confirmation period
   * and has a height one greater than the current confirmed block index.
   * @param header Block header to confirm.
   */
  function confirmBlock(Block.BlockHeader calldata header) external override {
    _confirmBlock(header);
  }

  /**
   * @dev getHardTransactionsFrom
   * Gets `max` hard transactions starting at `start`, or however
   * many transactions have been recorded if there are not `max` available.
   * @param start Start index
   * @param max Maximum number of hard transactions to retrieve.
   */
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

  /**
   * @dev getBlockHash
   * Gets the block hash at `height`.
   * @param height Block height to retrieve the hash of.
   */
  function getBlockHash(
    uint256 height
  ) external view override returns (bytes32) {
    return _state.blockHashes[height];
  }

  /**
   * @dev getBlockCount
   * Gets the number of blocks in the state.
   */
  function getBlockCount() external view override returns (uint256) {
    return _state.blockHashes.length;
  }

  /**
   * @dev Gets the number of confirmed blocks in the state.
   */
  function getConfirmedBlockCount() external view override returns (uint256) {
    return _state.confirmedBlocks;
  }

  /**
   * @dev Executes the withdrawals in a confirmed block.
   * @param parent Header of the previous block, used to determine which withdrawals were executed.
   * @param header Header of the block with the withdrawals to execute
   * @param transactionsData Transactions buffer from the block.
   * merkle tree.
   */
  function executeWithdrawals(
    Block.BlockHeader memory parent,
    Block.BlockHeader memory header,
    bytes memory transactionsData
  ) public override {
    bytes32 blockHash = header.blockHash();
    require(
      _state.blockIsConfirmed(header.blockNumber, blockHash) &&
      _state.blockIsConfirmed(parent.blockNumber, parent.blockHash()) &&
      header.blockNumber == parent.blockNumber + 1 &&
      header.hasTransactionsData(transactionsData) &&
      _state.withdrawalsProcessed[blockHash] == false,
      "Invalid inputs."
    );
    WD.GenericWithdrawal[] memory withdrawals = WD.extractWithdrawals(parent, transactionsData);
    _state.withdrawalsProcessed[blockHash] = true;
    for (uint256 i = 0; i < withdrawals.length; i++) {
      WD.GenericWithdrawal memory withdrawal = withdrawals[i];
      /* Transfer tokens to the recipient. */
      /* TODO - Add decimal conversion */
      require(
        tokenContract.transfer(
          withdrawal.withdrawalAddress,
          withdrawal.value
        ),
        "Token Transfer Failed"
      );
    }
  }

  /**
   * @dev submitBlock
   * Records a block as pending.
   * @notice Can only be called by `owner`.
   * @param input Block input to submit.
   */
  function submitBlock(Block.BlockInput memory input) public override onlyOwner {
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