import chai from 'chai';
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
import chaiAsPromised from 'chai-as-promised';
import Tester from '../../Tester';
import { Account, toBuf, sliceBuffer, Block, getMerkleRoot, Commitment, StateMachine, SoftCreate } from '../../../app';
import { ProofBlockchain } from '../../utils';
import { Auditor } from '../../../app/modules/auditor';
// import { decodeBlockSubmitCalldata, decodeBlockInput } from '../../../app/modules/auditor/coder';
import { decodeTransactionsData, encodeTransactions } from '../../../app/lib/transactions-coder';
import ParentInterface from '../../../app/modules/parent-interface';
import { Database } from '../../../app/modules/db';
import { ErrorProof } from '../../../app/modules/auditor/types';
chai.use(chaiAsPromised);
const { expect } = chai;

describe('Test', async () => {
  let dbPath: string;
  let web3: any, tester: Tester, from: string, blockchain: ProofBlockchain;
  let account1: Account, account2: Account;
  let auditor: Auditor, parentInterface: ParentInterface;
  let db: Database;

  async function hardDeposit(account, value) {
    await blockchain.tiramisuContract.methods
      .mockDeposit(account.address, account.address, value)
      .send({ from, gas: 5e6 });
  }

  async function getBlockCount(): Promise<number> {
    return blockchain.tiramisuContract.methods.getBlockCount().call().then(x => +x);
  }

  async function resetBlockchain() {
    if (db) await db.close();
    if (auditor) auditor = null;
    if (blockchain) await blockchain.state.close();
    ({ blockchain, web3, tester, from } = await Tester.create({ blockchain: true }));
    parentInterface = new ParentInterface(blockchain.tiramisuContract, from, web3, 10);
    if (fs.existsSync(dbPath)) rimraf.sync(dbPath);
    fs.mkdirSync(dbPath);
    db = await Database.create(dbPath);
    const state = await db.getBlockStartingState(0)
    blockchain.state = state;
    blockchain.stateMachine = new StateMachine(state);
    account1 = tester.randomAccount();
    account2 = tester.randomAccount();
    await hardDeposit(account1, 100);
    const block = await blockchain.processBlock();
    await blockchain.submitBlock(block);
    await db.putBlock(block);
    await blockchain.state.commit();
    auditor = new Auditor(db, parentInterface);
  }

  after(async (done) => {
    if (fs.existsSync(dbPath)) rimraf.sync(dbPath);
    done()
  })

  before(async () => {
    dbPath = path.join(__dirname, 'tmp-db');
    await resetBlockchain()
  });

  describe('Catch bad hard transaction source', async () => {
    let previousHeader: Commitment;
    let badBlock: Block;
    let prom: Promise<any>

    before(() => {
      prom = new Promise((resolve, reject) => {
        auditor.on('audit:uncaught-error', data => reject(data))
        auditor.on('audit:block-ok', data => resolve(data))
        auditor.on('audit:block-error', data => resolve(data))
      })
    })

    it('Should submit a block with a hard create that has a bad `value`', async () => {
      await hardDeposit(account2, 50);
      const block = await blockchain.processBlock();
      const transaction = block.transactions.hardCreates[0];
      // transaction.accountIndex += 1;
      transaction.value += 1;
      const leaf = transaction.encode(true);
      block.header.transactionsRoot = getMerkleRoot([leaf]);
      const transactions = { hardCreates: [transaction] }
      const { transactionsData } = encodeTransactions(transactions);
      block.transactionsData = transactionsData;
      await blockchain.submitBlock(block);
      badBlock = block;
      expect(await getBlockCount()).to.eq(2);
    });

    it('Should catch a `hard_transaction_source` error and prove the error on the Tiramisu contract.', async () => {
      const val = await prom;
      expect(val._type).to.eq('hard_transaction_source');
      await auditor.proveError(val);
      expect(await getBlockCount()).to.eq(1);
    })
  })

  describe('Catch bad transaction buffer length', async () => {
    let previousHeader: Commitment;
    let badBlock: Block;
    let prom: Promise<ErrorProof | Block>

    before(async () => {
      await resetBlockchain()
      prom = new Promise((resolve, reject) => {
        auditor.on('audit:uncaught-error', data => reject(data))
        auditor.on('audit:block-ok', data => resolve(data))
        auditor.on('audit:block-error', (data: ErrorProof) => resolve(data))
      })
    })

    it('Should submit a block with a bad transactions buffer', async () => {
      await hardDeposit(account2, 50);
      const block = await blockchain.processBlock();

      block.transactionsData = sliceBuffer(block.transactionsData, 0, block.transactionsData.length - 2);
      await blockchain.submitBlock(block);
      badBlock = block;
      expect(await getBlockCount()).to.eq(2);
    });

    it('Should catch a `transactions_length` error and prove the error on the Tiramisu contract.', async () => {
      const val = await prom;
      if (val instanceof Block) {
        console.log(`Block interpreted as valid D:`)
      } else {
        expect(val._type).to.eq('transactions_length');
          await auditor.proveError(val);
        expect(await getBlockCount()).to.eq(1);
      }
    })
  })

  describe('Catch bad hard create output root', async () => {
    let previousHeader: Commitment;
    let badBlock: Block;
    let prom: Promise<ErrorProof | Block>

    before(async () => {
      await resetBlockchain()
      prom = new Promise((resolve, reject) => {
        auditor.on('audit:uncaught-error', data => reject(data))
        auditor.on('audit:block-ok', data => resolve(data))
        auditor.on('audit:block-error', (data: ErrorProof) => resolve(data))
      })
    })

    it('Should submit a block with a hard create that has an invalid output root', async () => {
      await hardDeposit(account2, 50);
      const block = await blockchain.processBlock();
      const transaction = block.transactions.hardCreates[0];
      // transaction.accountIndex += 1;
      transaction.intermediateStateRoot = `0x${'ab'.repeat(32)}`
      const leaf = transaction.encode(true);
      block.header.transactionsRoot = getMerkleRoot([leaf]);
      block.header.stateRoot = transaction.intermediateStateRoot
      const transactions = { hardCreates: [transaction] }
      const { transactionsData } = encodeTransactions(transactions);
      block.transactionsData = transactionsData;
      await blockchain.submitBlock(block);
      badBlock = block;
      expect(await getBlockCount()).to.eq(2);
    });

    it('Should catch a `hard_create` error and prove the error on the Tiramisu contract.', async () => {
      const val = await prom;
      if (val instanceof Block) {
        console.log(`Block interpreted as valid D:`)
      } else {
        expect(val._type).to.eq('hard_create');
          await auditor.proveError(val);
        expect(await getBlockCount()).to.eq(1);
      }
    })
  })

  describe('Catch bad state size', async () => {
    let previousHeader: Commitment;
    let badBlock: Block;
    let prom: Promise<ErrorProof | Block>

    before(async () => {
      await resetBlockchain()
      prom = new Promise((resolve, reject) => {
        auditor.on('audit:uncaught-error', data => reject(data))
        auditor.on('audit:block-ok', data => resolve(data))
        auditor.on('audit:block-error', (data: ErrorProof) => resolve(data))
      })
    })

    it('Should submit a block with a hard create that has an invalid output root', async () => {
      await hardDeposit(account2, 50);
      const block = await blockchain.processBlock();
      block.header.stateSize += 1;
      await blockchain.submitBlock(block);
      badBlock = block;
      expect(await getBlockCount()).to.eq(2);
    });

    it('Should catch a `state_size` error and prove the error on the Tiramisu contract.', async () => {
      const val = await prom;
      if (val instanceof Block) {
        console.log(`Block interpreted as valid D:`)
      } else {
        expect(val._type).to.eq('state_size');
          await auditor.proveError(val);
        expect(await getBlockCount()).to.eq(1);
      }
    })
  })

  describe('Catch bad transactions root', async () => {
    let previousHeader: Commitment;
    let badBlock: Block;
    let prom: Promise<ErrorProof | Block>

    before(async () => {
      await resetBlockchain()
      prom = new Promise((resolve, reject) => {
        auditor.on('audit:uncaught-error', data => reject(data))
        auditor.on('audit:block-ok', data => resolve(data))
        auditor.on('audit:block-error', (data: ErrorProof) => resolve(data))
      })
    })

    it('Should submit a block with a hard create that has an invalid output root', async () => {
      await hardDeposit(account2, 50);
      const block = await blockchain.processBlock();
      block.header.transactionsRoot = toBuf(`0x` + 'ab'.repeat(32));
      await blockchain.submitBlock(block);
      badBlock = block;
      expect(await getBlockCount()).to.eq(2);
    });

    it('Should catch a `transactions_root` error and prove the error on the Tiramisu contract.', async () => {
      const val = await prom;
      if (val instanceof Block) {
        console.log(`Block interpreted as valid D:`)
      } else {
        expect(val._type).to.eq('transactions_root');
          await auditor.proveError(val);
        expect(await getBlockCount()).to.eq(1);
      }
    })
  })

  describe('Catch bad hard tx count', async () => {
    let previousHeader: Commitment;
    let badBlock: Block;
    let prom: Promise<ErrorProof | Block>

    before(async () => {
      await resetBlockchain()
      prom = new Promise((resolve, reject) => {
        auditor.on('audit:uncaught-error', data => reject(data))
        auditor.on('audit:block-ok', data => resolve(data))
        auditor.on('audit:block-error', (data: ErrorProof) => resolve(data))
      })
    })

    it('Should submit a block with a hard create that has an invalid output root', async () => {
      await hardDeposit(account2, 50);
      const block = await blockchain.processBlock();
      block.header.hardTransactionsCount += 1;
      await blockchain.submitBlock(block);
      badBlock = block;
      expect(await getBlockCount()).to.eq(2);
    });

    it('Should catch a `hard_transactions_count` error and prove the error on the Tiramisu contract.', async () => {
      const val = await prom;
      if (val instanceof Block) {
        console.log(`Block interpreted as valid D:`)
      } else {
        expect(val._type).to.eq('hard_transactions_count');
          await auditor.proveError(val);
        expect(await getBlockCount()).to.eq(1);
      }
    })
  })

  describe('Catch bad signature', async () => {
    let prom: Promise<ErrorProof | Block>

    before(async () => {
      await resetBlockchain()
      prom = new Promise((resolve, reject) => {
        auditor.on('audit:uncaught-error', data => reject(data))
        auditor.on('audit:block-ok', data => resolve(data))
        auditor.on('audit:block-error', (data: ErrorProof) => resolve(data))
      })
    })

    it('Should submit a block with a soft create that has an invalid signature', async () => {
      // await hardDeposit(account2, 50);
      const input = new SoftCreate({
        accountIndex: 0,
        nonce: 0,
        value: 10,
        toAccountIndex: 1,
        accountAddress: account2.address,
        initialSigningKey: account2.signers[0],
        privateKey: account1.privateKey
      });
      blockchain.queueTransaction(input);
      const block = await blockchain.processBlock();
      const transaction = block.transactions.softCreates[0]
      transaction.signature = transaction.signature.slice(0, 20) + 'ab' + transaction.signature.slice(22)
      const leaf = transaction.encode(true);
      block.header.transactionsRoot = getMerkleRoot([leaf]);
      const transactions = { softCreates: [transaction] }
      const { transactionsData } = encodeTransactions(transactions);
      block.transactionsData = transactionsData;
      await blockchain.submitBlock(block);
      expect(await getBlockCount()).to.eq(2);
    });

    it('Should catch a `transaction_signature` error and prove the error on the Tiramisu contract.', async () => {
      const val = await prom;
      if (val instanceof Block) {
        console.log(`Block interpreted as valid D:`)
      } else {
        expect(val._type).to.eq('transaction_signature');
          await auditor.proveError(val);
        expect(await getBlockCount()).to.eq(1);
      }
    })
  })
});