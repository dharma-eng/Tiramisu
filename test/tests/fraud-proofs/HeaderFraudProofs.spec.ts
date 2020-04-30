import chai from 'chai';
import Tester from '../../Tester';
import { Blockchain } from '../../../app';

import { BlockType, Commitment } from '../../../app/types';
import { randomHexBuffer } from '../../utils';

const { expect } = chai;

export const test = () => describe("Header Fraud Proof Tests", () => {
  let web3: any, tester: Tester, from: string, blockchain: Blockchain;

  async function resetBlockchain() {
    const { dai, peg } = blockchain;
    await peg.methods.resetChain().send({ from, gas: 5e6 });
    const state = await tester.newState();
    blockchain = new Blockchain({ web3, fromAddress: from, dai, peg, state });
  }

  async function hardDeposit(account, value) {
    await blockchain.peg.methods
      .mockDeposit(account.address, account.address, value)
      .send({ from, gas: 5e6 });
  }

  before(async () => {
    ({ blockchain, web3, tester, from } = await Tester.create({ blockchain: true }));
  });

  describe('State Size Error', async () => {
    let previousHeader: Commitment;
    let badBlock: BlockType;
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
      const blockCount = await blockchain.peg.methods.getBlockCount().call();
      expect(blockCount).to.eql('2');
    });

    it('Should prove fraud by calling proveStateSizeError', async () => {
      await blockchain.peg.methods
        .proveStateSizeError(
          previousHeader, badBlock.commitment, badBlock.transactionsData
        ).send({ from, gas: 5e6 });
    });

    it('Should have updated the block count', async () => {
      const blockCount = await blockchain.peg.methods.getBlockCount().call();
      expect(blockCount).to.eql('1');
    });
  });

  describe('Transactions Root Error', async () => {
    let previousHeader: Commitment;
    let badBlock: BlockType;
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
      const blockCount = await blockchain.peg.methods.getBlockCount().call();
      expect(blockCount).to.eql('2');
    });

    it('Should prove fraud by calling proveTransactionsRootError', async () => {
      await blockchain.peg.methods
        .proveTransactionsRootError(
          badBlock.commitment, badBlock.transactionsData
        ).send({ from, gas: 5e6 });
    });

    it('Should have updated the block count', async () => {
      const blockCount = await blockchain.peg.methods.getBlockCount().call();
      expect(blockCount).to.eql('1');
    });
  });

  describe('Hard Transactions Range Error', async () => {
    let previousHeader: Commitment;
    let badBlock: BlockType;
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
      badBlock.header.hardTransactionsCount += 1;
      await blockchain.submitBlock(badBlock);
      const blockCount = await blockchain.peg.methods.getBlockCount().call();
      expect(blockCount).to.eql('2');
    });

    it('Should prove fraud by calling proveHardTransactionRangeError', async () => {
      await blockchain.peg.methods
        .proveHardTransactionRangeError(
          previousHeader, badBlock.commitment, badBlock.transactionsData
        ).send({ from, gas: 5e6 });
    });

    it('Should have updated the block count', async () => {
      const blockCount = await blockchain.peg.methods.getBlockCount().call();
      expect(blockCount).to.eql('1');
    });
  });
});

if (process.env.NODE_ENV != 'all' && process.env.NODE_ENV != 'coverage') test();