import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Tester from '../../Tester';
import { Block, Commitment, Blockchain } from '../../../app';
import { randomHexBuffer } from '../../utils';
chai.use(chaiAsPromised);
const { expect } = chai;

export const test = () => describe("Header Fraud Proof Tests", () => {
  let web3: any, tester: Tester, from: string, blockchain: Blockchain;

  async function resetBlockchain() {
    const { token, tiramisuContract } = blockchain;
    await tiramisuContract.methods.resetChain().send({ from, gas: 5e6 });
    const state = await tester.newState();
    blockchain = new Blockchain({ web3, fromAddress: from, token, tiramisuContract, state });
  }

  async function hardDeposit(account, value) {
    await blockchain.tiramisuContract.methods
      .mockDeposit(account.address, account.address, value)
      .send({ from, gas: 5e6 });
  }

  before(async () => {
    ({ blockchain, web3, tester, from } = await Tester.create({ blockchain: true }));
  });

  describe('State Size Error', async () => {
    let previousHeader: Commitment;
    let badBlock: Block;
    let account1, account2;

    before(async () => {
      account1 = tester.randomAccount();
      account2 = tester.randomAccount();
    });

    /* previousHeader
badHeader
transactionsData */

    it("Should process, submit and confirm an initial block.", async () => {
      await hardDeposit(account1, 100);
      let block = await blockchain.processBlock();
      await blockchain.submitBlock(block);
      await blockchain.confirmBlock(block);
      previousHeader = block.commitment;
    });

    it('Should submit a block with a bad state size field.', async () => {
      await hardDeposit(account2, 100);
      badBlock = await blockchain.processBlock();
      badBlock.header.stateSize += 1;
      await blockchain.submitBlock(badBlock);
      const blockCount = await blockchain.tiramisuContract.methods.getBlockCount().call();
      expect(+blockCount).to.eql(3);
    });

    it('Should prove fraud by calling proveStateSizeError', async () => {
      await blockchain.tiramisuContract.methods
        .proveStateSizeError(
          previousHeader, badBlock.commitment, badBlock.transactionsData
        ).send({ from, gas: 5e6 });
    });

    it('Should have updated the block count', async () => {
      const blockCount = await blockchain.tiramisuContract.methods.getBlockCount().call();
      expect(+blockCount).to.eql(2);
    });
  });

  describe('Transactions Root Error', async () => {
    let previousHeader: Commitment;
    let badBlock: Block;
    let account1, account2;

    before(async () => {
      await resetBlockchain();
      account1 = tester.randomAccount();
      account2 = tester.randomAccount();
    });

    it("Should process, submit and confirm an initial block.", async () => {
      await hardDeposit(account1, 100);
      let block = await blockchain.processBlock();
      await blockchain.submitBlock(block);
      await blockchain.confirmBlock(block);
      previousHeader = block.commitment;
    });

    it('Should submit a block with a bad transactions root.', async () => {
      await hardDeposit(account2, 100);
      badBlock = await blockchain.processBlock();
      badBlock.header.transactionsRoot = randomHexBuffer(32);
      await blockchain.submitBlock(badBlock);
      const blockCount = await blockchain.tiramisuContract.methods.getBlockCount().call();
      expect(+blockCount).to.eql(3);
    });

    it('Should prove fraud by calling proveTransactionsRootError', async () => {
      await blockchain.tiramisuContract.methods
        .proveTransactionsRootError(
          badBlock.commitment, badBlock.transactionsData
        ).send({ from, gas: 5e6 });
    });

    it('Should have updated the block count', async () => {
      const blockCount = await blockchain.tiramisuContract.methods.getBlockCount().call();
      expect(+blockCount).to.eql(2);
    });
  });

  describe('Hard Transactions Count Error', async () => {
    let previousHeader: Commitment;
    let badBlock: Block;
    let account1, account2;

    before(async () => {
      await resetBlockchain();
      account1 = tester.randomAccount();
      account2 = tester.randomAccount();
    });

    it("Should process, submit and confirm an initial block.", async () => {
      await hardDeposit(account1, 100);
      let block = await blockchain.processBlock();
      await blockchain.submitBlock(block);
      await blockchain.confirmBlock(block);
      previousHeader = block.commitment;
    });

    it('Should submit a block with a bad hard transaction count.', async () => {
      await hardDeposit(account2, 100);
      badBlock = await blockchain.processBlock();
      badBlock.header.hardTransactionsCount = 5;
      await blockchain.submitBlock(badBlock);
      const blockCount = await blockchain.tiramisuContract.methods.getBlockCount().call();
      expect(+blockCount).to.eql(3);
    });

    it('Should prove fraud by calling proveHardTransactionsCountError', async () => {
      await blockchain.tiramisuContract.methods
        .proveHardTransactionsCountError(
          previousHeader, badBlock.commitment, badBlock.transactionsData
        ).send({ from, gas: 5e6 });
    });

    it('Should have updated the block count', async () => {
      const blockCount = await blockchain.tiramisuContract.methods.getBlockCount().call();
      expect(+blockCount).to.eql(2);
    });

    it('Should not revert a block with a valid hard transactions count', async () => {
      await resetBlockchain();
      await hardDeposit(account1, 100);
      let block = await blockchain.processBlock();
      await blockchain.submitBlock(block);
      await blockchain.confirmBlock(block);
      previousHeader = block.commitment;
      await hardDeposit(account2, 100);
      badBlock = await blockchain.processBlock();
      await blockchain.submitBlock(badBlock);
      let blockCount = await blockchain.tiramisuContract.methods.getBlockCount().call();
      expect(+blockCount).to.eql(3);
      const promise = blockchain.tiramisuContract.methods
        .proveHardTransactionsCountError(
          previousHeader, badBlock.commitment, badBlock.transactionsData
        ).send({ from, gas: 5e6 })
      expect(promise).to.eventually.be.rejectedWith('VM Exception while processing transaction: revert Hard transactions count not invalid.')
    })
  });

  describe('Hard Transactions Range Error', async () => {
    let previousHeader: Commitment;
    let badBlock: Block;
    let account1, account2;

    before(async () => {
      await resetBlockchain();
      account1 = tester.randomAccount();
      account2 = tester.randomAccount();
    });

    it("Should process, submit and confirm an initial block.", async () => {
      await hardDeposit(account1, 100);
      let block = await blockchain.processBlock();
      await blockchain.submitBlock(block);
      await blockchain.confirmBlock(block);
      previousHeader = block.commitment;
      const blockCount = await blockchain.tiramisuContract.methods.getBlockCount().call();
      expect(+blockCount).to.eq(previousHeader.blockNumber + 1);
    });

    it('Should submit a block with a duplicate hard transaction index.', async () => {
      await hardDeposit(account2, 100);
      await hardDeposit(account1, 100);
      const block = await blockchain.processBlock();
      const tx0 = block.transactions.hardCreates[0];
      const tx1 = block.transactions.hardDeposits[0];
      tx1.hardTransactionIndex = tx0.hardTransactionIndex;
      badBlock = new Block({
        ...block.header,
        hardTransactionsIndex: block.header.hardTransactionsCount - 2,
        transactions: { hardCreates: [tx0], hardDeposits: [tx1] }
      });
      await blockchain.submitBlock(badBlock);
      const blockCount = await blockchain.tiramisuContract.methods.getBlockCount().call();
      expect(+blockCount).to.eq(badBlock.header.blockNumber + 1);
    });

    it('Should prove fraud by calling proveHardTransactionsRangeError', async () => {
      await blockchain.tiramisuContract.methods
        .proveHardTransactionsRangeError(
          previousHeader, badBlock.commitment, badBlock.transactionsData
        ).send({ from, gas: 5e6 });
    });

    it('Should have updated the block count', async () => {
      const blockCount = await blockchain.tiramisuContract.methods.getBlockCount().call();
      expect(+blockCount).to.eql(2);
    });

    it('Should not revert a valid block', async () => {
      await resetBlockchain();
      await hardDeposit(account1, 100);
      let block = await blockchain.processBlock();
      await blockchain.submitBlock(block);
      await blockchain.confirmBlock(block);
      previousHeader = block.commitment;
      await hardDeposit(account2, 100);
      await hardDeposit(account1, 100);
      badBlock = await blockchain.processBlock();
      await blockchain.submitBlock(badBlock);
      let blockCount = await blockchain.tiramisuContract.methods.getBlockCount().call();
      expect(+blockCount).to.eql(3);
      const promise = blockchain.tiramisuContract.methods
        .proveHardTransactionsRangeError(
          previousHeader, badBlock.commitment, badBlock.transactionsData
        ).send({ from, gas: 5e6 })
      expect(promise).to.eventually.be.rejectedWith('VM Exception while processing transaction: revert Fraud not found in hard tx range.')
    })
  });
});

if (process.env.NODE_ENV != 'all' && process.env.NODE_ENV != 'coverage') test();
