const { expect } = require('chai');
const { privateToAddress } = require('ethereumjs-utils')
const { Account, HardCreate, HardDeposit, SoftTransfer, SoftWithdrawal } = require('./types');
const { randomHexBuffer } = require('../utils/test-utils/random');
const { getMerkleProof } = require('../utils/merkle');
const { getWeb3 } = require('../utils/test-utils/web3');
const { toHex } = require('./lib/to');
const Blockchain = require('./Blockchain');

const privateKey1 = randomHexBuffer(32);
const address1 = toHex(privateToAddress(privateKey1));

describe('Blockchain', () => {
  let blockchain, web3, from, accounts;
  accounts = [];
  before(async () => {
    await getWeb3().then(({accounts: _accounts, from: _from, web3: _web3}) => {
      web3 = _web3;
      from = _from;
      accounts = _accounts;
    });
    blockchain = await Blockchain.create(web3, from);
  });

  // it('Should make an incoming transaction.', async)

  let block, from2;
  describe('Hard Transactions', () => {
    it ('Should register a hard create transaction through the mock peg.', async () => {
      from2 = accounts[1];
      await blockchain.peg.methods.mockDeposit(
        address1, address1, 500
      ).send({ from: from2, gas: 5e6 });
      const hardTransactions = await blockchain.getHardTransactions();
      expect(hardTransactions.length).to.eql(1);
      const hardTx = hardTransactions[0];
      expect(hardTx.hardTransactionIndex).to.eql(0);
      expect(hardTx.contractAddress.toLowerCase()).to.eql(address1);
      expect(hardTx.signerAddress.toLowerCase()).to.eql(address1);
      expect(hardTx.value).to.eql(500);
    });
  });

  describe('Block Production', async () => {
    it('Should process a new block with the recorded hard transaction.', async () => {
      block = await blockchain.processBlock();
    });

    it('Should have updated the state size, block number and hard transactions count', () => {
      expect(blockchain.hardTransactionsIndex).to.eql(1);
      expect(blockchain.blockNumber).to.eql(1);
      expect(blockchain.state.size).to.eql(1);
    });

    it('Should have returned a valid block', async () => {
      const { header } = block;
      expect(header.version).to.eql(0);
      expect(header.hardTransactionsCount).to.eql(1);
      expect(header.blockNumber).to.eql(0);
      expect(header.stateSize).to.eql(1);
      expect(blockchain.state.size).to.eql(1);
      expect(await blockchain.state.rootHash()).to.eql(header.stateRoot);
    });

    it('Should have created the new account', async () => {
      const account = await blockchain.state.getAccount(0);
      expect(account.address.toLowerCase()).to.eql(address1);
      expect(account.hasSigner(address1)).to.be.true;
      expect(account.balance).to.eql(500);
    });
  });

  describe('Block Submission', async () => {
    it('Should submit a block to the chain peg', async () => {
      await blockchain.submitBlock(block);
    });

    it('Should locally calculate the correct block hash', async () => {
      const blockHash = block.blockHash(blockchain.web3);
      const committedHash = await blockchain.peg.methods.blockHashes(0).call();
      expect(blockHash).to.eql(committedHash);
    });

    it('Should confirm a block', async () => {
      await blockchain.confirmBlock(block);
      const lastConfirmedBlock = await blockchain.peg.methods.confirmedBlocks().call()
      expect(lastConfirmedBlock).to.eql('1');
    })
  });

  describe('Withdrawal', () => {
    let withdrawal, leaf1, siblings;
  
    it('Should process a soft withdrawal transaction.', async () => {
      withdrawal = new SoftWithdrawal({
        fromAccountIndex: 0,
        withdrawalAddress: address1,
        nonce: 0,
        value: 100,
        privateKey: privateKey1
      });
      blockchain.queueTransaction(withdrawal)
      block = await blockchain.processBlock();
    });

    it('Should submit and confirm the block with the withdrawal', async () => {
      await blockchain.submitBlock(block);
      await blockchain.confirmBlock(block);
    });
    
    it('Should produce a merkle proof of the withdrawal transaction', () => {
      expect(block.transactionsData.length).to.eql(withdrawal.encode(false).length + 16);
      leaf1 = withdrawal.encode(true);
      siblings = getMerkleProof([leaf1], 0).siblings;
    });

    it('Should execute the withdrawal using the merkle proof', async () => {
      await blockchain.peg.methods.executeWithdrawal(
        block.commitment,
        leaf1,
        0,
        siblings
      ).send({
        from: from2,
        gas: 5e5
      });
    });

    it(`Should have sent the DAI from the withdrawal to the withdrawal address`, async () => {
      const daiContract = await blockchain.getDaiContract();
      const balance = await daiContract.methods.balanceOf(address1).call();
      expect(balance).to.eql('100')
    })

  })
})