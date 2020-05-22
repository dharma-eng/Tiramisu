import Block from "../block";
import Account from '../account';
import AuditProofProvider from "./provider";
import { StateMachine, State } from "../state";
import { decodeHardTransactions } from "../../lib";
import { HardTransactionSourceError, TransactionSignatureError } from "./types/transaction-errors";
import {
  HardTransactionUnion, HardCreate, HardDeposit, HardWithdraw, HardAddSigner,
  SoftWithdrawal, SoftCreate, SoftTransfer, SoftChangeSigner, SoftTransactionUnion
} from "../transactions";
import {
  ErrorProof, ProvableError, PreviousRootProof, PreviousStateProof,
  CommitmentProof, TransactionProof, HardDepositExecutionError
} from "./types";
import {
  ProofData_Basic, HardCreateExecutionError, CreateIndexError, SoftWithdrawalExecutionError,
  SoftCreateExecutionError, SoftTransferExecutionError, SoftChangeSignerExecutionError
} from "./types/execution-errors";

const ABI = require('web3-eth-abi');

export class ExecutionAuditor extends StateMachine {
  private constructor(
    public parentBlock: Block,
    public block: Block,
    state: State,
    private realHardTransactions: { [key: number]: HardTransactionUnion }
  ) {
    super(state);
  }

  static async auditBlockExecution(
    provider: AuditProofProvider,
    parentBlock: Block,
    block: Block,
  ): Promise<State> {
    /* Retrieve the state tree the block started with. */
    const state = await provider.getBlockStartingState(block.header.blockNumber);
    /* Retrieve the actual hard transactions recorded on the Tiramisu contract. */
    const { hardTransactionsCount } = parentBlock.header;
    const hardTransactionsLength = block.transactionsArray.filter(tx => tx.prefix < 4).length;
    // console.log(`Getting inputs from Tiramisu -- Index: ${hardTransactionsCount} | Length: ${hardTransactionsLength}`)
    const encodedInputs = await provider.getHardTransactions(
      hardTransactionsCount, hardTransactionsLength
    );
    // TODO -- add better handling to decodeHardTransactions
    // so that rather than naively assign types, it will determine which tx type to assign accounts
    // by looking ahead and backwards in the array
    const decodedInputs = await decodeHardTransactions(state, hardTransactionsCount, encodedInputs);

    /* Map the transactions to their indices for quick lookup and comparison */
    const inputsMap = decodedInputs.reduce((obj, val) => ({
      ...obj,
      [val.hardTransactionIndex]: val
    }), {});
    const auditor = new ExecutionAuditor(
      parentBlock,
      block,
      state,
      inputsMap
    );
    await auditor.validateTransactions();
    return state;
  }

  fail(_error: ErrorProof) {
    throw new ProvableError(_error);
  }

  async getPreviousStateProof(
    transactionIndex: number,
    accountIndex: number
  ): Promise<PreviousStateProof> {
    let rootProof: PreviousRootProof;
    if (transactionIndex == 0) {
      rootProof = { ...this.parentBlock.commitment, _type: 'commitment' } as CommitmentProof;
    } else {
      rootProof = this.block.proveTransaction(transactionIndex - 1) as TransactionProof;
    }
    const stateProof = await this.state.getAccountProof(accountIndex);
    
    return {
      stateProof,
      previousRootProof: rootProof
    };
  }

  async getBasicProof(transactionIndex: number, accountIndex: number): Promise<ProofData_Basic> {
    const stateProof = await this.getPreviousStateProof(transactionIndex, accountIndex);
    const { transaction, siblings } = this.block.proveTransaction(transactionIndex);
    return {
      header: this.block.commitment,
      ...stateProof,
      transaction,
      transactionIndex,
      siblings
    };
  }

  async validateTransactions() {
    const {
      hardCreates,
      hardDeposits,
      hardWithdrawals,
      hardAddSigners,
      softWithdrawals,
      softCreates,
      softTransfers,
      softChangeSigners
    } = this.block.transactions;
    console.log(`Checking block execution...`)
    await Promise.all(hardCreates.map((tx, i) => this.validateHardCreate(tx, i)));
    await Promise.all(hardDeposits.map((tx, i) => this.validateHardDeposit(tx, i)));
    await Promise.all(hardWithdrawals.map((tx, i) => this.validateHardWithdrawal(tx, i)));
    await Promise.all(hardAddSigners.map((tx, i) => this.validateHardAddSigner(tx, i)));
    await Promise.all(softWithdrawals.map((tx, i) => this.validateSoftWithdrawal(tx, i)));
    await Promise.all(softCreates.map((tx, i) => this.validateSoftCreate(tx, i)));
    await Promise.all(softTransfers.map((tx, i) => this.validateSoftTransfer(tx, i)));
    await Promise.all(softChangeSigners.map((tx, i) => this.validateSoftChangeSigner(tx, i)));
  }

  async validateHardCreate(transaction: HardCreate, index: number) {
    const real = this.realHardTransactions[transaction.hardTransactionIndex];
    if (
      real.prefix != 0 ||
      real.accountAddress != transaction.accountAddress ||
      real.initialSigningKey != transaction.initialSigningKey ||
      real.value != transaction.value
    ) {
      const { transaction, siblings } = this.block.proveTransaction(index);
      const err = {
        _type: "hard_transaction_source",
        header: this.block.commitment,
        transactionIndex: index,
        transaction,
        siblings
      } as HardTransactionSourceError;
      this.fail(err);
    }
    const existingIndex = await this.state.getAccountIndexByAddress(transaction.accountAddress);
    // Check if the address already had an account
    if (existingIndex) {
      const err = await this.getBasicProof(index, existingIndex) as HardCreateExecutionError;
      err._type = "hard_create";
      this.fail(err as HardCreateExecutionError)
    }
    // Check if the created account index is correct
    if (transaction.accountIndex != this.state.size) {
      const err = {
        _type: "create_index_error",
        previousHeader: this.parentBlock.commitment,
        header: this.block.commitment,
        transactionIndex: index,
        transactionsData: this.block.transactionsData
      } as CreateIndexError;
      this.fail(err);
    }
    // TODO
    // Add checkpoint/commit/revert to SparseMerkleTree so we don't always have to
    // precalculate proof data which might not be used.
    const err = await this.getBasicProof(index, transaction.accountIndex) as HardCreateExecutionError;
    err._type = "hard_create";

    const root = '' + transaction.intermediateStateRoot;
    await this.hardCreate(transaction);
    if (transaction.intermediateStateRoot != root) this.fail(err);
  }

  async validateHardDeposit(transaction: HardDeposit, index: number) {
    const real = this.realHardTransactions[transaction.hardTransactionIndex];
    if (
      real.prefix != 0 || // Note: all deposits have prefix 0
      real.accountIndex != transaction.accountIndex ||
      real.value != transaction.value
    ) {
      const { transaction, siblings } = this.block.proveTransaction(index);
      const err = {
        _type: "hard_transaction_source",
        header: this.block.commitment,
        transactionIndex: index,
        transaction,
        siblings
      } as HardTransactionSourceError;
      this.fail(err);
    }
    
    // TODO
    // Add checkpoint/commit/revert to SparseMerkleTree so we don't always have to
    // precalculate proof data which might not be used.
    const err = await this.getBasicProof(index, transaction.accountIndex) as HardDepositExecutionError;
    err._type = "hard_deposit";
    // Check if the account existed
    if (!(await this.state.getAccount(transaction.accountIndex))) {
      this.fail(err);
    }
    const root = '' + transaction.intermediateStateRoot;
    await this.hardDeposit(transaction);
    if (root != transaction.intermediateStateRoot) this.fail(err);
  }

  async validateHardWithdrawal(transaction: HardWithdraw, index: number) {
    const real = this.realHardTransactions[transaction.hardTransactionIndex];
    if (
      real.prefix != 2 ||
      real.accountIndex != transaction.accountIndex ||
      real.callerAddress != transaction.callerAddress ||
      real.value != transaction.value
    ) {
      const { transaction, siblings } = this.block.proveTransaction(index);
      const err = {
        header: this.block.commitment,
        transactionIndex: index,
        transaction,
        siblings
      } as HardTransactionSourceError;
      this.fail(err);
    }
    
    // TODO
    // Add checkpoint/commit/revert to SparseMerkleTree so we don't always have to
    // precalculate proof data which might not be used.
    const err = await this.getBasicProof(index, transaction.accountIndex) as HardDepositExecutionError;
    // If the account did not exist or had an insufficient balance,
    // the transaction should have a null output root.
    const account = await this.state.getAccount(transaction.accountIndex);
    if (
      (!account || account.balance < transaction.value) &&
      transaction.intermediateStateRoot != `0x${'00'.repeat(32)}`
    ) {
      this.fail(err);
    }
    const root = '' + transaction.intermediateStateRoot;
    await this.hardWithdraw(transaction);
    if (transaction.intermediateStateRoot != root) this.fail(err);
  }

  async validateHardAddSigner(transaction: HardAddSigner, index: number) {
    const real = this.realHardTransactions[transaction.hardTransactionIndex];
    const account = await this.state.getAccount(real.accountIndex);
    const callerMismatch = !account || (real.prefix == 3 && real.callerAddress != account.address);
    if (
      real.prefix != 3 ||
      real.accountIndex != transaction.accountIndex ||
      real.signingAddress != transaction.signingAddress ||
      callerMismatch
    ) {
      const { transaction, siblings } = this.block.proveTransaction(index);
      const { stateProof, previousRootProof } = callerMismatch
        ? await this.getPreviousStateProof(index, real.accountIndex)
        : { stateProof: '0x', previousRootProof: '0x' }
      const err = {
        header: this.block.commitment,
        transactionIndex: index,
        transaction,
        siblings,
        stateProof,
        previousRootProof,
        _type: 'hard_transaction_source'
      } as HardTransactionSourceError;
      this.fail(err);
    }
    // Transaction comes from the submitted block.
    // Encoded HardAddSigner functions do not include the callerAddress field,
    // so it must be copied from the original hard tx.
    transaction.callerAddress = (real as HardAddSigner).callerAddress;
    // TODO
    // Add checkpoint/commit/revert to SparseMerkleTree so we don't always have to
    // precalculate proof data which might not be used.
    const err = await this.getBasicProof(index, transaction.accountIndex) as HardDepositExecutionError;
    // If the account did not exist or had an insufficient balance,
    // the transaction should have a null output root.
    // const account = await this.state.getAccount(transaction.accountIndex);
    if (
      (
        !account.hasSigner(transaction.signingAddress) ||
        account.signers.length == 10
      ) &&
      transaction.intermediateStateRoot != `0x${'00'.repeat(32)}`
    ) {
      this.fail(err);
    }
    const root = '' + transaction.intermediateStateRoot;
    await this.hardAddSigner(transaction);
    if (
      transaction.intermediateStateRoot != root
    ) this.fail(err);
  }

  async checkSignature(transaction: SoftTransactionUnion, index: number): Promise<Account> {
    let signer: string;
    try {
      signer = transaction.getSignerAddress()
      if (!signer) throw new Error()
    } catch (err) {
      this.fail({
        header: this.block.commitment,
        ...this.block.proveTransaction(index),
        transactionIndex: index,
        _type: 'transaction_signature',
      } as TransactionSignatureError)
    }
    const account = await this.state.getAccount(transaction.accountIndex);
    if (!account.hasSigner(signer)) {
      const err = await this.getBasicProof(index, transaction.accountIndex);
      this.fail({
        ...err,
        _type: 'transaction_signature'
      } as TransactionSignatureError);
    }
    return account;
  }

  async validateSoftWithdrawal(transaction: SoftWithdrawal, index: number) {
    const account = await this.checkSignature(transaction, index);
    const err = {
      ...(await this.getBasicProof(index, transaction.accountIndex)),
      _type: 'soft_withdrawal'
    } as SoftWithdrawalExecutionError;
    if (
      account.balance < transaction.value ||
      account.nonce != transaction.nonce
    ) {
      this.fail(err);
    }
    account.balance -= transaction.value;
    account.nonce += 1;
    await this.state.updateAccount(transaction.accountIndex, account);
    if (
      transaction.intermediateStateRoot != await this.state.rootHash()
    ) this.fail(err);
  }

  async validateSoftCreate(transaction: SoftCreate, index: number) {
    // Check if the transaction had a valid signature (encoding & account match)
    const account = await this.checkSignature(transaction, index);
    // Set up the error proof
    // TODO commit/revert on sparse merkle tree so we don't have to pre-calc
    // proofs we may never use.
    const { stateProof, ...rest } = await this.getBasicProof(index, transaction.accountIndex);
    const err = {
      ...rest,
      senderProof: stateProof,
      _type: 'soft_create'
    } as SoftCreateExecutionError
    // Check if transaction was allowable given the caller's account
    if (
      account.balance < transaction.value ||
      account.nonce != transaction.nonce
    ) this.fail(err);
    // Update the account & state
    // we don't use the underlying state machine because we need to get intermediate state proofs
    account.balance -= transaction.value;
    account.nonce += 1;
    await this.state.updateAccount(transaction.accountIndex, account);
    /*
      The reason this does both index checks is because the latter is much more expensive,
      even though it is sufficient to cover the former case.
    */
    // Check if the `toAccountIndex` already existed.
    const existingIndex = await this.state.getAccountIndexByAddress(transaction.accountAddress);
    if (existingIndex != null) {
      err.receiverProof = await this.state.getAccountProof(existingIndex);
      this.fail(err);
    }
    // TODO replace this with something more elegant
    // Check if the created account index is correct
    if (transaction.toAccountIndex != this.state.size) {
      const err = {
        _type: "create_index_error",
        previousHeader: this.parentBlock.commitment,
        header: this.block.commitment,
        transactionIndex: index,
        transactionsData: this.block.transactionsData
      } as CreateIndexError;
      this.fail(err);
    }
    // Get the proof of the null leaf the account will be inserted into.
    err.receiverProof = await this.state.getAccountProof(transaction.toAccountIndex);
    // Insert the account into the state.
    const newAccount = new Account({
      address: transaction.accountAddress,
      nonce: 0,
      balance: transaction.value,
      signers: [transaction.initialSigningKey]
    }) as Account;
    await this.state.putAccount(newAccount);
    // Compare the output root.
    if (
      transaction.intermediateStateRoot != await this.state.rootHash()
    ) this.fail(err);
  }

  async validateSoftTransfer(transaction: SoftTransfer, index: number) {
    // Check if the transaction had a valid signature (encoding & account match)
    const account = await this.checkSignature(transaction, index);
    // Set up the error proof
    // TODO commit/revert on sparse merkle tree so we don't have to pre-calc
    // proofs we may never use.
    const { stateProof, ...rest } = await this.getBasicProof(index, transaction.accountIndex);
    const err = {
      ...rest,
      senderProof: stateProof,
      _type: 'soft_transfer'
    } as SoftTransferExecutionError;
    // Check if transaction was allowable given the caller's account
    if (
      account.balance < transaction.value ||
      account.nonce != transaction.nonce
    ) this.fail(err);
    // Update the account & state
    // we don't use the underlying state machine because we need to get intermediate state proofs
    account.balance -= transaction.value;
    account.nonce += 1;
    await this.state.updateAccount(transaction.accountIndex, account);
    err.receiverProof = await this.state.getAccountProof(transaction.toAccountIndex);
    const receiver = await this.state.getAccount(transaction.toAccountIndex);
    if (!receiver) this.fail(err);
    receiver.balance += transaction.value;
    await this.state.updateAccount(transaction.toAccountIndex, receiver);
    if (
      transaction.intermediateStateRoot != await this.state.rootHash()
    ) this.fail(err);
  }

  async validateSoftChangeSigner(transaction: SoftChangeSigner, index: number) {
    // Check if the transaction had a valid signature (encoding & account match)
    const account = await this.checkSignature(transaction, index);
    const err = {
      ...(await this.getBasicProof(index, transaction.accountIndex)),
      _type: 'soft_change_signer'
    } as SoftChangeSignerExecutionError;
    if (!account || account.nonce != transaction.nonce) this.fail(err);
    const { signingAddress } = transaction;
    if (transaction.modificationCategory == 0) {
      if (
        account.hasSigner(signingAddress) ||
        account.signers.length == 10
      ) this.fail(err);
      account.addSigner(signingAddress)
    } else if (transaction.modificationCategory == 1) {
      if (!account.hasSigner(signingAddress)) this.fail(err);
      account.removeSigner(signingAddress)
    } else this.fail(err);
    account.nonce += 1;
    await this.state.updateAccount(transaction.accountIndex, account);
    if (
      transaction.intermediateStateRoot != await this.state.rootHash()
    ) this.fail(err);
  }
}