const { expect } = require("chai");
const { Account, SoftWithdrawal } = require("../../app/types");
const { getMerkleProof } = require("../../app/lib/merkle");
const Tester = require("../Tester");

describe("Blockchain", () => {
  let tester, web3, from, accounts;

  before(async () => {
    ({ tester, web3, from, accounts } = await Tester.create());
  });

  const compareAddresses = (address1, address2) => {
    expect(address1.toLowerCase()).to.eql(address2.toLowerCase());
  };

  describe("Hard Transaction Retrieval", async () => {
    let blockchain;

    before(async () => {
      blockchain = await tester.newBlockchain();
    });

    const retrieveHardTransaction = async (prefix, length, index) => {
      const hardTransactions = await blockchain.getHardTransactions();
      expect(hardTransactions.length).to.eql(length);
      const hardTx = hardTransactions[index];
      expect(hardTx.prefix).to.eql(prefix);
      expect(hardTx.hardTransactionIndex).to.eql(index);
      return hardTx;
    };

    it("Should retrieve a deposit from the mock peg and cast it to a HardCreate.", async () => {
      const { address } = tester.randomAccount();
      await blockchain.peg.methods
        .mockDeposit(address, address, 500)
        .send({ from, gas: 5e6 });

      const hardTx = await retrieveHardTransaction(0, 1, 0);
      const { contractAddress, signerAddress } = hardTx;
      compareAddresses(contractAddress, address);
      compareAddresses(signerAddress, address);
      expect(hardTx.value).to.eql(500);
    });

    it("Should retrieve a deposit from the mock peg and cast it to a HardDeposit.", async () => {
      const newAccount = tester.randomAccount();
      const accountIndex = await blockchain.state.putAccount(newAccount);
      await blockchain.peg.methods
        .mockDeposit(newAccount.address, newAccount.address, 500)
        .send({ from, gas: 5e6 });

      const hardTx = await retrieveHardTransaction(1, 2, 1);
      expect(hardTx.accountIndex).to.eql(accountIndex);
      expect(hardTx.value).to.eql(500);
    });

    it("Should retrieve a HardWithdraw from the mock peg", async () => {
      const accountIndex = 3;
      const value = 9;

      await blockchain.peg.methods
        .forceWithdrawal(accountIndex, value)
        .send({ from, gas: 5e6 });

      const hardTx = await retrieveHardTransaction(2, 3, 2);
      compareAddresses(hardTx.callerAddress, from);
      expect(hardTx.accountIndex).to.eql(accountIndex);
      expect(hardTx.value).to.eql(value);
    });

    it("Should retrieve a HardAddSigner from the mock peg.", async () => {
      let accountIndex = 5;
      let signingAddress = tester.randomAccount().address;

      await blockchain.peg.methods
        .forceAddSigner(accountIndex, signingAddress)
        .send({ from, gas: 5e6 });

      const hardTx = await retrieveHardTransaction(3, 4, 3);

      expect(hardTx.accountIndex).to.eql(accountIndex);
      compareAddresses(hardTx.signingAddress, signingAddress);
      compareAddresses(hardTx.callerAddress, from);
    });
  });

  describe("Block Production & Submission", async () => {
    let blockchain, block;
    let account1, account2;

    before(async () => {
      blockchain = await tester.newBlockchain();
      account1 = tester.randomAccount();
      account2 = tester.randomAccount();
    });

    async function hardDeposit(account, value) {
      await blockchain.peg.methods
        .mockDeposit(account.address, account.address, value)
        .send({ from, gas: 5e6 });
    }

    async function hardWithdraw(accountIndex, value, caller = from) {
      const receipt = await blockchain.peg.methods
        .forceWithdrawal(accountIndex, value)
        .send({ from: caller, gas: 5e6 });
      console.log(receipt.events.NewHardTransaction);
    }

    function softWithdraw(account, fromAccountIndex, value) {
      const transaction = new SoftWithdrawal({
        fromAccountIndex,
        withdrawalAddress: account.address,
        nonce: account.nonce,
        value,
        privateKey: account.privateKey
      });
      const promise = blockchain.queueTransaction(transaction);
      return {
        transaction,
        promise
      };
    }

    async function expectAccount(accountIndex, account) {
      const retrievedAccount = await blockchain.state.getAccount(accountIndex);
      expect(retrievedAccount.encode()).to.eql(account.encode());
    }

    describe("Block Production", async () => {
      it("Should process a new block with two hard creates.", async () => {
        await hardDeposit(account1, 100);
        await hardDeposit(account2, 100);
        block = await blockchain.processBlock();
      });

      it(`Should update the blockchain's stateSize, blockNumber, hardTransactionsIndex`, () => {
        expect(blockchain.hardTransactionsIndex).to.eql(2);
        expect(blockchain.blockNumber).to.eql(1);
        expect(blockchain.state.size).to.eql(2);
      });

      it("Should create two new accounts", async () => {
        account1.balance = 100;
        account2.balance = 100;
        await expectAccount(0, account1);
        await expectAccount(1, account2);
      });

      it("Should return a valid block header", async () => {
        const { header } = block;
        expect(header.version).to.eql(0);
        expect(header.hardTransactionsCount).to.eql(2);
        expect(header.blockNumber).to.eql(0);
        expect(header.stateSize).to.eql(blockchain.state.size);
        expect(header.stateRoot).to.eql(await blockchain.state.rootHash());
      });
    });

    describe("Block Submission", async () => {
      it("Should submit a block to the chain peg", async () => {
        await blockchain.submitBlock(block);
      });

      it("Should locally calculate the correct block hash", async () => {
        const blockHash = block.blockHash(blockchain.web3);
        const committedHash = await blockchain.peg.methods
          .blockHashes(0)
          .call();
        expect(blockHash).to.eql(committedHash);
      });

      it("Should confirm a block", async () => {
        await blockchain.confirmBlock(block);
        const lastConfirmedBlock = await blockchain.peg.methods
          .confirmedBlocks()
          .call();
        expect(lastConfirmedBlock).to.eql("1");
      });
    });

    describe("Withdrawal Processing", async () => {
      describe("Soft Withdrawal", async () => {
        let withdrawal, withdrawalPromise, leaf1, siblings;
        it("Should execute a soft withdrawal transaction.", async () => {
          const { transaction, promise } = softWithdraw(account1, 0, 50);
          withdrawal = transaction;
          withdrawalPromise = promise;
          block = await blockchain.processBlock();
          const intermediateStateRoot = await withdrawalPromise;
          expect(withdrawal.intermediateStateRoot).to.eql(
            intermediateStateRoot
          );
          const account = await blockchain.state.getAccount(0);
          expect(account.balance).to.eql(50);
        });

        it("Should submit and confirm the block with the withdrawal", async () => {
          await blockchain.submitBlock(block);
          await blockchain.confirmBlock(block);
        });

        it("Should produce a merkle proof of the withdrawal transaction", () => {
          expect(block.transactionsData.length).to.eql(
            withdrawal.encode(false).length + 16
          );
          leaf1 = withdrawal.encode(true);
          siblings = getMerkleProof([leaf1], 0).siblings;
        });

        it("Should execute the withdrawal using the merkle proof", async () => {
          await blockchain.peg.methods
            .executeWithdrawal(block.commitment, leaf1, 0, siblings)
            .send({ from, gas: 5e5 });
        });

        it(`Should have sent the DAI from the withdrawal to the withdrawal address`, async () => {
          const daiContract = await blockchain.dai;
          const balance = await daiContract.methods
            .balanceOf(account1.address)
            .call();
          expect(balance).to.eql("50");
        });
      });

      describe("Hard Withdrawal", async () => {
        let withdrawal, leaf1, siblings, account, hardAddress;
        before(async () => {
          hardAddress = accounts[2];
          account = new Account({
            address: hardAddress,
            nonce: 0,
            balance: 100,
            signers: [hardAddress]
          });
        });
        it("Should execute a hard withdrawal transaction.", async () => {
          const accountIndex = await blockchain.state.putAccount(account);
          await blockchain.peg.methods
            .forceWithdrawal(accountIndex, 50)
            .send({ from: hardAddress, gas: 5e6 });
          block = await blockchain.processBlock();
          withdrawal = block.transactions.hardWithdrawals[0];
          const _account = await blockchain.state.getAccount(accountIndex);
          expect(_account.balance).to.eql(50);
        });

        it("Should submit and confirm the block with the withdrawal", async () => {
          await blockchain.submitBlock(block);
          await blockchain.confirmBlock(block);
        });

        it("Should produce a merkle proof of the withdrawal transaction", () => {
          expect(block.transactionsData.length).to.eql(
            withdrawal.encode(false).length + 16
          );
          leaf1 = withdrawal.encode(true);
          siblings = getMerkleProof([leaf1], 0).siblings;
        });

        it("Should execute the withdrawal using the merkle proof", async () => {
          await blockchain.peg.methods
            .executeWithdrawal(block.commitment, leaf1, 0, siblings)
            .send({ from, gas: 5e5 });
        });

        it(`Should have sent the DAI from the withdrawal to the withdrawal address`, async () => {
          const daiContract = await blockchain.dai;
          const balance = await daiContract.methods
            .balanceOf(hardAddress)
            .call();
          expect(balance).to.eql("50");
        });
      });
    });
  });
});
