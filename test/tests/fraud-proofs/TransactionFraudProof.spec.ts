import {
  HardCreate,
  HardDeposit,
  HardWithdraw,
  HardAddSigner,
  Block,
  Commitment,
  getMerkleProof,
  getMerkleRoot,
  transactionsToArray,
  SoftTransfer
} from '../../../app';
import chai from 'chai';
import Tester from '../../Tester';
import { randomHexString } from '../../utils/random';
import { ProofBlockchain } from '../../utils/ProofBlockchain';

const { expect } = chai;

export type TransactionSourceErrorInducer<T> = (transaction: T) => Buffer;

export const test = () => describe("Transaction Fraud Proof Tests", async () => {
  let tester: Tester, web3: any, from: string, accounts: string[], blockchain: ProofBlockchain;

  async function resetBlockchain() {
    blockchain = await tester.newProofBlockchain();
  }

  before(async () => {
    ({ tester, web3, from, accounts, blockchain } = await Tester.create({ blockchain: true }));
  });

  async function hardDeposit(account, value) {
    await blockchain.tiramisuContract.methods
      .mockDeposit(account.address, account.address, value)
      .send({ from, gas: 5e6 });
  }

  async function hardWithdraw(accountIndex, value, caller = from) {
    await blockchain.tiramisuContract.methods
      .forceWithdrawal(accountIndex, value)
      .send({ from: caller, gas: 5e6 });
  }

  async function getBlockCount(): Promise<number> {
    return blockchain.tiramisuContract.methods.getBlockCount().call().then(x => +x);
  }

  describe('Hard Transaction Source Error', async () => {
    let previousHeader: Commitment;
    let badBlock: Block;
    let account1, account2;

    before(async () => {
      account1 = tester.randomAccount();
      account2 = tester.randomAccount();
    });

    afterEach(async () => await resetBlockchain());

    it('Should prove hard tx index is greater than hard tx length', async () => {
      await hardDeposit(account1, 50);
      const block = await blockchain.processBlock();
      await blockchain.tiramisuContract.methods.resetChain().send({ from });
      await blockchain.submitBlock(block);
      const n = +(await getBlockCount());
      // expect(await getBlockCount()).to.eql(1);
      const transaction = block.transactions.hardCreates[0];
      const leaf = transaction.encode(true);
      const siblings = getMerkleProof([leaf], 0).siblings;
      await blockchain.tiramisuContract.methods.proveHardTransactionSourceError(
        block.commitment,
        leaf,
        0,
        siblings,
        '0x',
        '0x'
      ).send({ from });
      expect(await getBlockCount()).to.eql(n-1);
    });

    describe('Hard Create Source Error', async () => {
      async function executeFraudProof(errorInducer: (transaction: HardCreate) => Buffer) {
        await hardDeposit(account1, 50);
        const block = await blockchain.processBlock();
        const transaction = block.transactions.hardCreates[0];
        const leaf = errorInducer(transaction);
        block.header.transactionsRoot = getMerkleRoot([leaf]);
        await blockchain.submitBlock(block);
        const n = +(await getBlockCount());
        const siblings = getMerkleProof([leaf], 0).siblings;
        await blockchain.tiramisuContract.methods.proveHardTransactionSourceError(
          block.commitment,
          leaf,
          0,
          siblings,
          '0x',
          '0x'
        ).send({ from });
        expect(await getBlockCount()).to.eql(n-1);
      }

      it('Should prove that a hard create has a bad length', async () => {
        const errorInducer = (transaction: HardCreate): Buffer => {
          const leaf = transaction.encode(true);
          return leaf.slice(0, leaf.length - 1)
        };
        await executeFraudProof(errorInducer);
      });

      it('Should prove that a hard create has a bad prefix', async () => {
        const errorInducer = (transaction: HardCreate): Buffer => {
          const leaf = transaction.encode(true);
          leaf[0] = 0x2;
          return leaf;
        };
        await executeFraudProof(errorInducer);
      });

      it('Should prove that a hard create has a bad `value` field.', async () => {
        const errorInducer = (transaction: HardCreate): Buffer => {
          transaction.value += 1;
          const leaf = transaction.encode(true);
          return leaf;
        };
        await executeFraudProof(errorInducer);
      });

      it('Should prove that a hard create has a bad `accountAddress` field.', async () => {
        const errorInducer = (transaction: HardCreate): Buffer => {
          transaction.accountAddress = randomHexString(20);
          const leaf = transaction.encode(true);
          return leaf;
        };
        await executeFraudProof(errorInducer);
      });

      it('Should prove that a hard create has a bad `signerAddress` field.', async () => {
        const errorInducer = (transaction: HardCreate): Buffer => {
          transaction.initialSigningKey = randomHexString(20);
          const leaf = transaction.encode(true);
          return leaf;
        };
        await executeFraudProof(errorInducer);
      });
    });

    describe('Hard Deposit Source Error', async () => {
      async function executeFraudProof(
        options: {
          accountIndex?: number,
          transactionIndex?: number,
          getPriorStateProof?: boolean,
          proofSetup?: () => Promise<void>,
          transactionMutator?: (transaction: HardDeposit) => Buffer
        }
      ) {
        let { accountIndex, transactionIndex, getPriorStateProof, proofSetup, transactionMutator } = options;
        transactionIndex = transactionIndex || 0;
        if (proofSetup) await proofSetup();
        else await hardDeposit(account1, 50)
        let block: Block;
        let previousStateProof;
        let accountProof;
        let transactionProof;
        let transactionData;

        if (getPriorStateProof) {
          ({ block, transactionData, accountProof, previousStateProof, transactionProof } = await blockchain.processBlockForProof({
            accountIndex,
            transactionIndex,
            transactionMutator
          }));
        } else {
          block = await blockchain.processBlock();
          accountProof = '0x';
          previousStateProof = '0x';
          const transaction = block.transactions.hardDeposits[transactionIndex];
          const leaves = transactionsToArray(block.transactions).map(tx => tx.encode(true));
          if (transactionMutator) leaves[transactionIndex] = transactionMutator(transaction);
          transactionProof = getMerkleProof(leaves, transactionIndex).siblings;
          transactionData = leaves[transactionIndex];
          block.header.transactionsRoot = getMerkleRoot(leaves);
        }
        const n = await getBlockCount();
        await blockchain.submitBlock(block);
        expect(await getBlockCount()).to.eql(n+1);
        await blockchain.tiramisuContract.methods.proveHardTransactionSourceError(
          block.commitment,
          transactionData,
          transactionIndex,
          transactionProof,
          previousStateProof,
          accountProof
        ).send({ from, gas: 6e6 });
        expect(await getBlockCount()).to.eql(n);
      }

      /**
        Fraud conditions:
        - output tx size mismatch
        - prefix mismatch
        - output value does not match input value
        - an account existed with the contract address from the input, but the index in the output does not match it
          -- tx can not be processed to target an empty account
        - the account with the index in the output was either empty or had a different contract address from the input
      */
      it('Should prove that a hard deposit has a bad length', async () => {
        await executeFraudProof({
          proofSetup: async () => {
            await hardDeposit(account1, 20)
            const block = await blockchain.processBlock()
            await blockchain.submitBlock(block);
            await hardDeposit(account1, 20);
          },
          transactionMutator: (transaction: HardDeposit): Buffer => {
            const leaf = transaction.encode(true);
            return leaf.slice(0, leaf.length - 1);
          }
        });
      });

      it('Should prove that a hard deposit has a bad prefix', async () => {
        await executeFraudProof({
          proofSetup: async () => {
            await hardDeposit(account1, 20)
            const block = await blockchain.processBlock()
            await blockchain.submitBlock(block);
            await hardDeposit(account1, 20);
          },
          transactionMutator: (transaction: HardDeposit): Buffer => {
            const leaf = transaction.encode(true);
            leaf[0] = 0x2;
            return leaf;
          }
        });
      });

      it('Should prove that a hard deposit has a bad `value` field.', async () => {
        await executeFraudProof({
          proofSetup: async () => {
            await hardDeposit(account1, 20)
            const block = await blockchain.processBlock()
            await blockchain.submitBlock(block);
            await hardDeposit(account1, 20);
          },
          transactionMutator: (transaction: HardDeposit): Buffer => {
            transaction.value += 1;
            return transaction.encode(true);
          }
        });
      });

      it('Should prove that a hard deposit has an account index which does not match the recipient address.', async () => {
        await executeFraudProof({
          proofSetup: async () => {
            await hardDeposit(account1, 20);
            await hardDeposit(account2, 20);
            const block = await blockchain.processBlock()
            await blockchain.submitBlock(block);
            await hardDeposit(account1, 20);
            await hardDeposit(account2, 20);
          },
          transactionMutator: (transaction: HardDeposit): Buffer => {
            transaction.accountIndex = 0;
            return transaction.encode(true);
          },
          accountIndex: 0,
          transactionIndex: 1,
          getPriorStateProof: true
        });
      });
    });

    describe('Hard Withdraw Source Error', async () => {
      async function executeFraudProof(errorInducer: (transaction: HardWithdraw) => Buffer) {
        await hardDeposit(account1, 50);
        await hardWithdraw(0, 10)
        const block = await blockchain.processBlock();
        const transaction = block.transactions.hardWithdrawals[0];
        const leaves = transactionsToArray(block.transactions).map(tx => tx.encode(true));
        leaves[1] = errorInducer(transaction);
        const transactionProof = getMerkleProof(leaves, 1).siblings;
        const transactionData = leaves[1];
        block.header.transactionsRoot = getMerkleRoot(leaves);
        await blockchain.submitBlock(block);
        const n = +(await getBlockCount());
        await blockchain.tiramisuContract.methods.proveHardTransactionSourceError(
          block.commitment,
          transactionData,
          1,
          transactionProof,
          '0x',
          '0x'
        ).send({ from });
        expect(await getBlockCount()).to.eql(n-1);
      }

      /**
      Fraud conditions:
      - output tx size mismatch
      - prefix mismatch
      - output value, account index or withdrawal address do not match input
    */
      it('Should prove that a hard withdraw has a bad length', async () => {
        await executeFraudProof((transaction: HardWithdraw): Buffer => {
          const leaf = transaction.encode(true);
          return leaf.slice(0, leaf.length - 1);
        });
      });

      it('Should prove that a hard withdraw has a bad prefix', async () => {
        await executeFraudProof((transaction: HardWithdraw): Buffer => {
          const leaf = transaction.encode(true);
          leaf[0] = 0x1;
          return leaf;
        });
      });

      it('Should prove that a hard withdraw has a bad `accountIndex` field.', async () => {
        await executeFraudProof((transaction: HardWithdraw): Buffer => {
          transaction.accountIndex += 1;
          return transaction.encode(true);
        });
      });

      it('Should prove that a hard withdraw has a bad `value` field.', async () => {
        await executeFraudProof((transaction: HardWithdraw): Buffer => {
          transaction.value += 1;
          return transaction.encode(true);
        });
      });

      it('Should prove that a hard withdraw has a bad `callerAddress` field.', async () => {
        await executeFraudProof((transaction: HardWithdraw): Buffer => {
          transaction.callerAddress = `0x${'00'.repeat(20)}`;
          return transaction.encode(true);
        });
      });
    });

    describe('Hard Add Signer Source Error', async () => {
      async function executeFraudProof(errorInducer: (transaction: HardAddSigner) => Buffer) {
        await hardDeposit(account1, 50);
        await blockchain.tiramisuContract.methods
          .forceAddSigner(0, randomHexString(20))
          .send({ from, gas: 5e6 });
        const block = await blockchain.processBlock();
        const transaction = block.transactions.hardAddSigners[0];
        const leaves = transactionsToArray(block.transactions).map(tx => tx.encode(true));
        leaves[1] = errorInducer(transaction);
        const transactionProof = getMerkleProof(leaves, 1).siblings;
        const transactionData = leaves[1];
        block.header.transactionsRoot = getMerkleRoot(leaves);
        await blockchain.submitBlock(block);
        const n = +(await getBlockCount());
        await blockchain.tiramisuContract.methods.proveHardTransactionSourceError(
          block.commitment,
          transactionData,
          1,
          transactionProof,
          '0x',
          '0x'
        ).send({ from });
        expect(await getBlockCount()).to.eql(n-1);
      }

      /**
        Fraud conditions:
        - output tx has unexpected size
        - output tx has unexpected prefix
        - output account index or signing address don't match input value
      */
      it('Should prove that a hard add signer has a bad length', async () => {
        await executeFraudProof((transaction: HardAddSigner): Buffer => {
          const leaf = transaction.encode(true);
          return leaf.slice(0, leaf.length - 1);
        });
      });

      it('Should prove that a hard add signer has a bad prefix', async () => {
        await executeFraudProof((transaction: HardAddSigner): Buffer => {
          const leaf = transaction.encode(true);
          leaf[0] = 0x1;
          return leaf;
        });
      });

      it('Should prove that a hard add signer has a bad `accountIndex` field.', async () => {
        await executeFraudProof((transaction: HardAddSigner): Buffer => {
          transaction.accountIndex += 1;
          return transaction.encode(true);
        });
      });

      it('Should prove that a hard add signer has a bad `signingAddress` field.', async () => {
        await executeFraudProof((transaction: HardAddSigner): Buffer => {
          transaction.signingAddress = `0x${'00'.repeat(20)}`;
          return transaction.encode(true);
        });
      });  
    });
  });

  describe('Soft Transaction Signature Error', async () => {
    let previousHeader: Commitment;
    let badBlock: Block;
    let account1, account2;

    before(async () => {
      account1 = tester.randomAccount();
      account2 = tester.randomAccount();
    });

    afterEach(async () => await resetBlockchain());

    describe('Soft Transfer Signature Error', async () => {
      async function executeFraudProof(errorInducer: (transaction: SoftTransfer) => Buffer) {
        await hardDeposit(account1, 50);
        await hardDeposit(account2, 50);
        blockchain.queueTransaction(new SoftTransfer({
          accountIndex: 0,
          toAccountIndex: 1,
          nonce: 0,
          value: 10,
          privateKey: account1.privateKey
        }))
        const block = await blockchain.processBlock();
        const transaction = block.transactions.softTransfers[0];
        const leaves = transactionsToArray(block.transactions).map(tx => tx.encode(true));
        leaves[1] = errorInducer(transaction);
        const transactionProof = getMerkleProof(leaves, 1).siblings;
        const transactionData = leaves[1];
        block.header.transactionsRoot = getMerkleRoot(leaves);
        await blockchain.submitBlock(block);
        const n = +(await getBlockCount());
        await blockchain.tiramisuContract.methods.proveSignatureError(
          block.commitment,
          transactionData,
          1,
          transactionProof,
          '0x',
          '0x'
        ).send({ from });
        expect(await getBlockCount()).to.eql(n-1);
      }

      it('Should prove that a soft transfer has an invalid signature', async () => {
        await executeFraudProof((transaction: SoftTransfer): Buffer => {
          transaction.signature = `0x${'00'.repeat(65)}`;
          return transaction.encode(true);
        });
      })
    })
  })
});

if (process.env.NODE_ENV != 'all' && process.env.NODE_ENV != 'coverage') test();
