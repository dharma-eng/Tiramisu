import chai from 'chai';
import Tester from '../../Tester';
import { getMerkleProof, Account, SoftWithdrawal, Blockchain } from '../../../app';

import {
  BlockType,
  Commitment,
  HardCreate,
} from '../../../app/types';

const { expect } = chai;

export const test = () => describe("Blockchain Tests", () => {
  let tester: Tester, web3: any, from: string, accounts: string[], blockchain: Blockchain;

  async function resetBlockchain() {
    blockchain = await tester.newBlockchain();
  }

  async function hardDeposit(account, value) {
    await blockchain.peg.methods
      .mockDeposit(account.address, account.address, value)
      .send({ from, gas: 5e6 });
  }

  before(async () => {
    ({ tester, web3, from, accounts } = await Tester.create());
    blockchain = await tester.newBlockchain();
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
});

test()