import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Tester from '../../Tester';
import { Block, Commitment, Blockchain, HardCreate, getMerkleRoot, getMerkleProof, encodeTransactions, transactionsToArray, SoftCreate, Account } from '../../../app';
import { randomHexBuffer, ProofBlockchain, randomHexString, encodeAccountProof } from '../../utils';
import { encodeTransactionStateProof } from '../../../app/modules/auditor/coder';
chai.use(chaiAsPromised);
const { expect } = chai;

export const test = () => describe("Header Fraud Proof Tests", async () => {
  let web3: any, tester: Tester, from: string, blockchain: ProofBlockchain;

  async function resetBlockchain() {
    const { dai, peg } = blockchain;
    await peg.methods.resetChain().send({ from, gas: 5e6 });
    const state = await tester.newState();
    blockchain = new ProofBlockchain({ web3, fromAddress: from, dai, peg, state });
  }

  async function hardDeposit(account, value) {
    await blockchain.peg.methods
      .mockDeposit(account.address, account.address, value)
      .send({ from, gas: 5e6 });
  }

  async function getBlockCount(): Promise<number> {
    return blockchain.peg.methods.getBlockCount().call().then(x => +x);
  }

  before(async () => {
    ({ blockchain, web3, tester, from } = await Tester.create({ blockchain: true }));
  });

  describe('Created Account Index Error', async () => {
    describe('Case 1: Single hard create', async () => {
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
        expect(await getBlockCount()).to.eq(1);
      });

      it('Should submit a block with a hard create that has a bad `accountIndex`', async () => {
        await hardDeposit(account2, 50);
        const block = await blockchain.processBlock();
        const transaction = block.transactions.hardCreates[0];
        transaction.accountIndex += 1;
        const leaf = transaction.encode(true);
        block.header.transactionsRoot = getMerkleRoot([leaf]);
        const transactions = { hardCreates: [transaction] }
        const { transactionsData } = encodeTransactions(transactions);
        block.transactionsData = transactionsData;
        await blockchain.submitBlock(block);
        badBlock = block;
        expect(await getBlockCount()).to.eq(2);
      });
  
      it('Should prove a hard create has a bad account index by calling `createdAccountIndexError`', async () => {
        await blockchain.peg.methods.createdAccountIndexError(
          previousHeader,
          badBlock.commitment,
          0,
          badBlock.transactionsData
        ).send({ from, gas: 5e6 })
        expect(await getBlockCount()).to.eq(1);
      });
    });

    describe('Case 2: Preceding unexecuted hard create', async () => {
      let previousHeader: Commitment;
      let badBlock: Block;
      let account1, account2, account3;

      before(async () => {
        await resetBlockchain();
        account1 = tester.randomAccount();
        account2 = tester.randomAccount();
        account3 = tester.randomAccount();
      });
  
      it("Should process, submit and confirm an initial block.", async () => {
        await hardDeposit(account1, 100);
        let block = await blockchain.processBlock();
        await blockchain.submitBlock(block);
        await blockchain.confirmBlock(block);
        previousHeader = block.commitment;
        expect(await getBlockCount()).to.eq(1);
      });

      it('Should submit a block with a hard create that has a null root.', async () => {
        await hardDeposit(account2, 50);
        await hardDeposit(account3, 50);
        const block = await blockchain.processBlock();
        const transaction = block.transactions.hardCreates[0];
        transaction.intermediateStateRoot = `0x${'00'.repeat(32)}`;
        const transaction1 = block.transactions.hardCreates[1];
        const leaves = [transaction, transaction1].map(t => t.encode(true));
        block.header.transactionsRoot = getMerkleRoot(leaves);
        const transactions = { hardCreates: [transaction, transaction1] }
        block.transactionsData = encodeTransactions(transactions).transactionsData;
        await blockchain.submitBlock(block);
        badBlock = block;
        expect(await getBlockCount()).to.eq(2);
      });
  
      it('Should prove a hard create has a bad account index by calling `createdAccountIndexError`', async () => {
        await blockchain.peg.methods.createdAccountIndexError(
          previousHeader,
          badBlock.commitment,
          1,
          badBlock.transactionsData
        ).send({ from, gas: 5e6 })
        expect(await getBlockCount()).to.eq(1);
      });
    });

    describe('Case 3: Failure', async () => {
      let previousHeader: Commitment;
      let badBlock: Block;
      let account1, account2, account3;

      before(async () => {
        await resetBlockchain();
        account1 = tester.randomAccount();
        account2 = tester.randomAccount();
        account3 = tester.randomAccount();
      });
  
      it("Should process, submit and confirm an initial block.", async () => {
        await hardDeposit(account1, 100);
        let block = await blockchain.processBlock();
        await blockchain.submitBlock(block);
        await blockchain.confirmBlock(block);
        previousHeader = block.commitment;
        expect(await getBlockCount()).to.eq(1);
      });

      it('Should submit a block with a hard create that has a null root.', async () => {
        await hardDeposit(account2, 50);
        await hardDeposit(account3, 50);
        const block = await blockchain.processBlock();
        await blockchain.submitBlock(block);
        badBlock = block;
        expect(await getBlockCount()).to.eq(2);
      });
  
      it('Should fail to revert a valid block.', async () => {
        const promise = blockchain.peg.methods.createdAccountIndexError(
          previousHeader,
          badBlock.commitment,
          1,
          badBlock.transactionsData
        ).send({ from })
        expect(promise).to.eventually.be.rejectedWith('VM Exception while processing transaction: revert Transaction had correct index.')
        expect(await getBlockCount()).to.eq(2);
      });
  
      it('Should reject a call with an out of range transaction.', async () => {
        const promise = blockchain.peg.methods.createdAccountIndexError(
          previousHeader,
          badBlock.commitment,
          3,
          badBlock.transactionsData
        ).send({ from })
        expect(promise).to.eventually.be.rejectedWith('VM Exception while processing transaction: revert Not a valid create index.')
        expect(await getBlockCount()).to.eq(2);
      });
    });
  });

  /* describe('Create Execution Error', async () => {
    let account1: Account, account2: Account;

    beforeEach(async () => {
      await resetBlockchain();
      account1 = tester.randomAccount();
      account2 = tester.randomAccount();
    });

    async function executeFraudProof(
      options: {
        soft?: boolean,
        accountIndex?: number,
        transactionIndex?: number,
        getPriorStateProof?: boolean,
        proofSetup?: () => Promise<void>,
        transactionMutator?: (transaction: HardCreate | SoftCreate) => Buffer,
        expectFailure?: string
      }
    ) {
      let { 
        accountIndex, transactionIndex,
        getPriorStateProof, proofSetup,
        transactionMutator, soft,
        expectFailure
      } = options;
      transactionIndex = transactionIndex || 0;
      if (proofSetup) await proofSetup();
      else await hardDeposit(account1, 50)
      let block: Block;
      let previousRootProof;
      let accountProof;
      let transactionProof;
      let transactionData;

      if (getPriorStateProof) {
        ({ block, transactionData, accountProof, previousStateProof: previousRootProof, transactionProof } = await blockchain.processBlockForProof({
          accountIndex,
          transactionIndex,
          transactionMutator
        }));
      } else {
        block = await blockchain.processBlock();
        accountProof = '0x';
        previousRootProof = '0x';
        const transaction = block.transactions[soft ? 'softCreates' : 'hardCreates'][transactionIndex]
        const leaves = transactionsToArray(block.transactions).map(tx => tx.encode(true));
        if (transactionMutator) leaves[transactionIndex] = transactionMutator(transaction);
        transactionProof = getMerkleProof(leaves, transactionIndex).siblings;
        transactionData = leaves[transactionIndex];
        block.header.transactionsRoot = getMerkleRoot(leaves);
      }
      const n = await getBlockCount();
      await blockchain.submitBlock(block);
      expect(await getBlockCount()).to.eql(n+1);
      const promise = blockchain.peg.methods.proveExecutionError(
        block.commitment,
        encodeTransactionStateProof({
          previousRootProof,
          transactionIndex,
          siblings: transactionProof
        }),
        transactionData,
        accountProof,
        '0x'
      )
          
      // const promise = blockchain.peg.methods.createExecutionError(
      //   block.commitment,
      //   transactionData,
      //   transactionIndex,
      //   transactionProof,
      //   previousRootProof,
      //   accountProof
      // ).send({ from, gas: 6e6 });
      if (expectFailure) {
        expect(promise).to.eventually.be.rejectedWith(`VM Exception while processing transaction: revert ${expectFailure}`);
        expect(await getBlockCount()).to.eql(n+1);
      } else {
        await promise;
        expect(await getBlockCount()).to.eql(n);
      }
    }

    it('Should prove that a hard create has a bad output root', async () => {
      await executeFraudProof({
        proofSetup: async () => {
          await hardDeposit(account1, 20)
          await hardDeposit(account2, 20);
        },
        getPriorStateProof: true,
        transactionIndex: 1,
        accountIndex: 1,
        transactionMutator: (transaction: HardCreate): Buffer => {
          transaction.intermediateStateRoot = randomHexString(32);
          return transaction.encode(true);
        }
      });
    });

    it('Should reject a hard create with a valid output root', async () => {
      await executeFraudProof({
        proofSetup: async () => {
          await hardDeposit(account1, 20)
          await hardDeposit(account2, 20);
        },
        getPriorStateProof: true,
        transactionIndex: 1,
        accountIndex: 1,
        expectFailure: `Transaction had valid output root.`,
        transactionMutator: (transaction: HardCreate): Buffer => {
          return transaction.encode(true);
        }
      });
    });

    it('Should prove that a soft create has a bad output root', async () => {
      await executeFraudProof({
        proofSetup: async () => {
          await hardDeposit(account1, 20);
          const transaction = new SoftCreate({
            accountIndex: 0,
            nonce: 0,
            value: 10,
            toAccountIndex: 1,
            accountAddress: account2.address,
            initialSigningKey: account2.signers[0],
            privateKey: account1.privateKey
          });
          blockchain.queueTransaction(transaction);
        },
        getPriorStateProof: true,
        transactionIndex: 1,
        accountIndex: 1,
        transactionMutator: (transaction: HardCreate): Buffer => {
          transaction.intermediateStateRoot = randomHexString(32);
          return transaction.encode(true);
        }
      });
    });
  }); */
});

if (process.env.NODE_ENV != 'all' && process.env.NODE_ENV != 'coverage') test();