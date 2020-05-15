import { StateMachine, State } from "../state";
import { sliceBuffer, getMerkleRoot, decodeHardTransactions } from "../../lib";
import Block from "../block";
import { TransactionMetadata, HardTransactionUnion, HardCreate, HardDeposit, HardWithdraw, HardAddSigner, SoftWithdrawal, SoftCreate, SoftTransfer, SoftChangeSigner } from "../transactions";
import AuditProofProvider from "./provider";
import {
  ErrorProof, ProvableError, TransactionStateProof, AccountProof, PreviousRootProof, PreviousStateProof, CommitmentProof, TransactionProof,
  HardDepositExecutionError
} from "./types";
import { ProofData_Basic, HardCreateExecutionError, CreateIndexError } from "./types/execution-errors";
import { HardTransactionSourceError } from "./types/transaction-errors";

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
    /* Retrieve the actual hard transactions recorded on the peg contract. */
    const { hardTransactionsCount } = parentBlock.header;
    const hardTransactionsLength = block.transactionsArray.filter(tx => tx.prefix < 4).length;
    console.log(`Getting inputs from peg -- Index: ${hardTransactionsCount} | Length: ${hardTransactionsLength}`)
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
    let accountProof: AccountProof;
    if (transactionIndex == 0) {
      rootProof = this.parentBlock.commitment as CommitmentProof;
    } else {
      rootProof = this.block.proveTransaction(transactionIndex - 1) as TransactionProof;
    }
    const merkleProof = await this.state.getAccountProof(accountIndex);
    accountProof = {
      accountIndex,
      data: merkleProof.value,
      siblings: merkleProof.siblings
    };
    return {
      accountProof,
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
    await this.hardCreate(transaction);
    if (transaction.intermediateStateRoot != await this.state.rootHash()) this.fail(err);
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
    await this.hardWithdraw(transaction);
    if (transaction.intermediateStateRoot != await this.state.rootHash()) this.fail(err);
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
      const { accountProof, previousRootProof } = callerMismatch
        ? await this.getPreviousStateProof(index, real.accountIndex)
        : { accountProof: '0x', previousRootProof: '0x' }
      const err = {
        header: this.block.commitment,
        transactionIndex: index,
        transaction,
        siblings,
        stateProof: accountProof,
        previousRootProof
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
    await this.hardAddSigner(transaction);
    if (transaction.intermediateStateRoot != await this.state.rootHash()) this.fail(err);
  }

  async validateSoftWithdrawal(transaction: SoftWithdrawal, index: number) {

  }

  async validateSoftCreate(transaction: SoftCreate, index: number) {

  }

  async validateSoftTransfer(transaction: SoftTransfer, index: number) {

  }

  async validateSoftChangeSigner(transaction: SoftChangeSigner, index: number) {

  }
}