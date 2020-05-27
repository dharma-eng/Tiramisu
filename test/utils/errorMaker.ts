import path from 'path';
import { randomFromArray, randomHexString, randomAccount } from  './random';
import { HardCreate, State, Block, Account, StateMachine, Transaction, encodeTransactions, encodeBlock, last, HardTransactionUnion, HardDeposit, HardWithdraw, HardAddSigner } from '../../app';
import ParentInterface from '../../app/modules/parent-interface';
import L2Client from './client';
import { Database } from '../../app/modules/db';
import DharmaL2Core from '../../app/tiramisu-core';
import Auditor from '../../app/modules/auditor';
import rimraf from 'rimraf';
import { ProvableError, ErrorProof } from '../../app/modules/auditor/types';

type HardCreateError = 'source_value' | 'source_address' | 'source_signer' |
'created_index' | 'existing_account' | 'not_empty' | 'output_root';

const randomHardCreateError = (): HardCreateError => randomFromArray([
  'source_value', 'source_address', 'source_signer', 'created_index',
  'existing_account', 'not_empty', 'output_root'
])

export type ErrorBuilderResult = {
  skipExecution?: boolean;
  expectError: string;
}

export enum TransactionType {
  HARD_CREATE = 0,
  HARD_DEPOSIT,
  HARD_WITHDRAW,
  HARD_ADD_SIGNER,
  // SOFT_WITHDRAW,
  // SOFT_CREATE,
  // SOFT_TRANSFER,
  // SOFT_CHANGE_SIGNER
}

export enum TransactionErrorLocation {
  SOURCE, // Trigger error at block construction
  // PRECONDITION, // Trigger error at tx submission.
  // OUTPUT // Trigger error at block construction
}

type HardCreateSourceError = `source_value` | `source_address` | `source_signer` | `source_prefix`;
type HardDepositSourceError = `source_value` | `source_index` | `source_prefix`;
type HardWithdrawSourceError = `source_value` | `source_caller` | `source_index` | `source_prefix`;
type HardAddSignerSourceError = `source_index` | `source_caller` | `source_signer` | `source_prefix`; 
type HardTransactionSourceError = HardCreateSourceError | HardDepositSourceError | HardWithdrawSourceError | HardAddSignerSourceError;

const randomSourceError = (): HardTransactionSourceError => randomFromArray([
  'source_value', 'source_address',
  'source_signer', 'source_prefix',
  'source_caller', 'source_index',
]);

type ErrorMaker = (block: Block) => Promise<Block>;

const sourceEditors = {
  source_value: (tx: HardCreate | HardDeposit | HardWithdraw) => { tx.value += 1; },
  source_signer: (tx: HardCreate | HardAddSigner) => {
    if (tx.prefix == 0) tx.initialSigningKey = randomHexString(20);
    else tx.signingAddress = randomHexString(20);
  },
  source_address: (tx: HardCreate) => { tx.accountAddress = randomHexString(20); },
  source_caller: (tx: HardWithdraw | HardAddSigner) => { tx.callerAddress = randomHexString(20); },
  source_index: (tx: HardDeposit | HardWithdraw | HardAddSigner) => { tx.accountIndex += 1; },
  source_prefix: (tx: HardTransactionUnion) => { tx.prefix += 1; }
}

class ManipulatedParentInterface extends ParentInterface {
  shouldCauseError: { [key: number]: ErrorMaker } = {};
  lastBlock: number = 0;
  async submitBlock(block: Block): Promise<void> {
    this.lastBlock = block.header.blockNumber;
    if (this.shouldCauseError[block.header.blockNumber]) {
      const blockToSubmit = await this.shouldCauseError[block.header.blockNumber](block);
      return super.submitBlock(blockToSubmit);
    }
    return super.submitBlock(block);
  }

  addErrorForBlock(errorMaker: ErrorMaker, blockNumber: number = this.lastBlock + 1) {
    this.shouldCauseError[blockNumber] = errorMaker;
  }
}

type TransactionKey = 'hardCreates' | 'hardDeposits' | 'hardWithdrawals' | 'hardAddSigners' |
  'softWithdrawals' | 'softCreates' | 'softTransfers' | 'softChangeSigners';

const transactionKeys = [
  'hardCreates', 'hardDeposits', 'hardWithdrawals', 'hardAddSigners',
  'softWithdrawals', 'softCreates', 'softTransfers', 'softChangeSigners'
]

function editTransaction(
  block: Block,
  transactionsKey: TransactionKey,
  edit: (transaction: Transaction) => void
): Block {
  edit(block.transactions[transactionsKey][0]);
  const { transactionsData, transactionsRoot } = encodeTransactions(block.transactions);
  block.transactionsData = transactionsData;
  block.header.transactionsRoot = transactionsRoot;
  block.header.stateRoot = last(block.transactionsArray).intermediateStateRoot;
  return block;
}

export class ErrorBuilder {
  expectError: string;
  accountsWithPendingBalance: {[key: string]: number} = {};
  clients: {[key: string]: L2Client} = {};
  pendingStateSize = 0;

  constructor(
    public parentInterface: ManipulatedParentInterface,
    public from: string,
    public core: DharmaL2Core,
    public auditor: Auditor,
    public dbPath: string
  ) {}

  get peg() { return this.parentInterface.peg; }
  get web3() { return this.parentInterface.web3; }

  static async create(
    web3: any,
    peg: any,
    from: string,
    dbPath?: string
  ): Promise<{ auditor: Auditor, builder: ErrorBuilder, core: DharmaL2Core }> {
    const db = await Database.create(dbPath);
    const parentInterface = new ManipulatedParentInterface(peg, from, web3, 10);
    const core = new DharmaL2Core(db, parentInterface, dbPath);
    const auditorDB = await Database.create(path.join(dbPath, 'auditor'));
    const auditor = new Auditor(auditorDB, parentInterface);
    const builder = new ErrorBuilder(parentInterface, from, core, auditor, dbPath);
    return { auditor, builder, core };
  }

  async closeAndDelete() {
    await this.core.close();
    this.auditor.removeAllListeners()
    await this.auditor.close();
    rimraf.sync(this.dbPath);
    rimraf.sync(path.join(this.dbPath, 'auditor'));
  }

  get randomAccountIndex(): number {
    return Math.floor(Math.random() * this.pendingStateSize);
  }

  get randomAccountAddress(): string {
    return randomFromArray(Object.keys(this.clients));
  }

  get randomExistingClient(): L2Client {
    return this.clients[this.randomAccountAddress];
  }
  
  async randomClient(): Promise<L2Client> {
    const account = this.web3.eth.accounts.create();
    await this.getEther(account.address);
    const client = new L2Client(this.web3, this.parentInterface.peg, account, this.pendingStateSize++);
    this.clients[account.address] = client;
    return client;
  }

  async getEther(address: string) {
    const accounts = await this.web3.eth.getAccounts();
    const from = accounts[0];
    await this.web3.eth.sendTransaction({ from, to: address, value: 1e16 });
  }

  randomHardCreate = async (value: number = 100): Promise<any> => {
    const account = await this.randomClient();
    this.accountsWithPendingBalance[account.address] = (
      this.accountsWithPendingBalance[account.address] || 0
    ) + value;
    return this.peg.methods.mockDeposit(
      account.address, account.signers[0], value
    ).send({ from: this.from, gas: 5e5 });
  }

  randomHardDeposit = async (value: number = 100): Promise<any> => {
    const address = await this.randomAccountAddress;
    this.accountsWithPendingBalance[address] = (
      this.accountsWithPendingBalance[address] || 0
    ) + value;
    return this.peg.methods.mockDeposit(
      address, address, value
    ).send({ from: this.from, gas: 5e5 });
  }

  randomHardWithdrawal = async (value: number = 100): Promise<any> => {
    const addresses = Object.keys(this.accountsWithPendingBalance).filter(
      (address) => this.accountsWithPendingBalance[address] >= value
    );
    if (!addresses.length) {
      await this.randomHardCreate(value);
      return this.randomHardWithdrawal(value);
    }
    const address = addresses[0];
    const client = this.clients[address];
    this.accountsWithPendingBalance[address] -= value;
    return client.hardWithdraw(value);
  }

  randomHardAddSigner = async (address: string = randomHexString(20)) => {
    const addresses = Object.keys(this.clients);
    if (!addresses.length) {
      await this.randomHardCreate();
      return this.randomHardAddSigner(address);
    }
    const client = this.clients[addresses[0]];
    return client.hardAddSigner(address);
  }

  buildWithSourceError = async (
    txType: TransactionType,
    errorType: HardTransactionSourceError = randomSourceError()
  ): Promise<void> => {
    let txKey: TransactionKey;
    switch(txType) {
      case TransactionType.HARD_CREATE:
        await this.randomHardCreate();
        txKey = 'hardCreates';
        break;
      case TransactionType.HARD_DEPOSIT:
        await this.randomHardDeposit();
        txKey = 'hardDeposits';
        break;
      case TransactionType.HARD_WITHDRAW:
        await this.randomHardWithdrawal();
        txKey = 'hardWithdrawals';
        break;
      case TransactionType.HARD_ADD_SIGNER:
        await this.randomHardAddSigner();
        txKey = 'hardAddSigners';
        break;
    }
    this.parentInterface.addErrorForBlock(
      async (block: Block) => editTransaction(block, txKey, sourceEditors[errorType])
    );
    return this.runBlockExpectError('hard_transaction_source');
  }

  async runBlockExpectError(expectError: string): Promise<void>;
  async runBlockExpectError(): Promise<Block>;
  async runBlockExpectError(expectError?: string): Promise<void | Block> {
    const prom: Promise<void | Block> = new Promise((resolve, reject) => {
      this.auditor.on('audit:uncaught-error', (err: any) => reject(err));
      this.auditor.on('audit:block-ok', (block: Block) => {
        if (expectError) return reject('No errors found in block.')
        resolve(block);
      });
      this.auditor.on('audit:block-error', (err: ErrorProof) => {
        if (expectError && err._type == expectError) return resolve();
        else reject(err);
      });
    });
    await this.core.processBlock();
    return prom;
  }

  // buildHardCreateError(
  //   tx: HardCreate,
  //   errorType: HardCreateError = randomHardCreateError()
  // ) {
  //   let expectError: string;
  //   switch (errorType) {
  //     case 'source_value':
  //       tx.value += 1;
  //       expectError = 'hard_transaction_source';
  //       break;
  //     case 'source_signer':
  //       tx.initialSigningKey = randomHexString(20);
  //       expectError = 'hard_transaction_source';
  //       break;
  //     case 'source_address':
  //       tx.accountAddress = randomHexString(20);
  //       expectError = 'hard_transaction_source';
  //       break;
  //     case 'created_index':
  //       tx.accountIndex += 1;
  //       expectError = 'create_index_error';
  //       break;
  //     case 'output_root':
  //       tx.intermediateStateRoot = randomHexString(32);
  //       expectError = 'hard_create';
  //       break;
  //   }
  // }
}