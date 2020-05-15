import chai from 'chai';
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
import chaiAsPromised from 'chai-as-promised';
import Tester from '../../Tester';
import { Account, toBuf, sliceBuffer, Block, getMerkleRoot, Commitment, StateMachine } from '../../../app';
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
    await blockchain.peg.methods
      .mockDeposit(account.address, account.address, value)
      .send({ from, gas: 5e6 });
  }

  async function getBlockCount(): Promise<number> {
    return blockchain.peg.methods.getBlockCount().call().then(x => +x);
  }

  before(async () => {
    dbPath = path.join(__dirname, 'tmp-db');
    if (fs.existsSync(dbPath)) rimraf.sync(dbPath);
    fs.mkdirSync(dbPath);
    
    ({ blockchain, web3, tester, from } = await Tester.create({ blockchain: true }));
    parentInterface = new ParentInterface(blockchain.peg, from, web3, 10);
    db = await Database.create(dbPath);
    const state = await db.getBlockStartingState(0)
    blockchain.state = state;
    blockchain.stateMachine = new StateMachine(state)
    // initialize blockchain & db with first block
    account1 = tester.randomAccount();
    account2 = tester.randomAccount();
    await hardDeposit(account1, 100);
    const block = await blockchain.processBlock();
    await blockchain.submitBlock(block);
    await db.putBlock(block);
    await blockchain.state.commit();
    auditor = new Auditor(db, parentInterface);
  });

  describe('Catch bad blocks', async () => {
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

    after(async (done) => {
      if (fs.existsSync(dbPath)) rimraf.sync(dbPath);
      done()
    });

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

    it('Should catch a `hard_transaction_source` error', async () => {
      const val = await prom;
      expect(val._type).to.eq('hard_transaction_source')
      // console.log(val)
      // console.log('finito!')
    })
  })

  // describe('Block Submission Decoder', async () => {
  //   let blockHash: string;
  //   let calldata: Buffer;
  //   let submittedAt: number;
  //   let receipt: any;
  //   let transactionsData: Buffer;
  //   let block: Block;

  //   it('Should submit a block to the peg contract', async () => {
  //     await hardDeposit(account1, 100);
  //     block = await blockchain.processBlock();
  //     receipt = await blockchain.peg.methods.submitBlock(block).send({ from });
  //     block.addOutput(receipt.blockNumber);
  //     blockHash = block.blockHash();
  //   });

  //   it('Should retrieve the inputs to the call from the receipt', async () => {
  //     const { blockNumber, transactionHash } = receipt;
  //     const transaction = await web3.eth.getTransaction(transactionHash);
  //     calldata = toBuf(transaction.input);
  //     submittedAt = blockNumber;
  //   });

  //   it('Should correctly decode the block submitted in the call', async () => {
  //     const blockInput = decodeBlockSubmitCalldata(calldata);
  //     const calculatedBlock = decodeBlockInput(blockInput, submittedAt);
  //     const calculatedHash = calculatedBlock.blockHash();
  //     expect(calculatedHash).to.eql(blockHash);
  //     transactionsData = block.transactionsData;
  //     console.log(transactionsData)
  //   });

  //   it('Should throw when the transactions are encoded incorrectly', async () => {
  //     const badTransactionData = sliceBuffer(transactionsData, 0, transactionsData.length - 3);
  //     const expectedMessage = [
  //       `Transaction decoding error at index 0`,
  //       `Expected 88 bytes in buffer at index 16`,
  //       `But buffer only had 85 remaining bytes.`
  //     ].join('\n');
  //     expect(() => decodeTransactionsData(badTransactionData)).to.throw(expectedMessage);
  //   });
  // });
});