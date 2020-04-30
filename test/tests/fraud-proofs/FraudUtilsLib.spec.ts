import chai from 'chai';
import Tester from '../../Tester';
import {
  Block,
  SoftWithdrawal,
} from '../../../app/types';
import { toHex, getMerkleProof } from '../../../app/lib';
import { Blockchain } from '../../../app';
const { expect } = chai;

export const test = () => describe('FraudUtilsLib', async () => {
  let tester: Tester, web3: any, from: string, accounts: string[], blockchain: Blockchain;

  before(async () => {
    ({ tester, web3, from, accounts, blockchain } = await Tester.create({ blockchain: true }));
  });

  async function hardDeposit(account, value) {
    await blockchain.peg.methods
      .mockDeposit(account.address, account.address, value)
      .send({ from, gas: 5e6 });
  }

  function softWithdraw(account, fromAccountIndex, value): { transaction: SoftWithdrawal, promise: Promise<Buffer> } {
    const transaction = new SoftWithdrawal({
      fromAccountIndex,
      withdrawalAddress: account.address,
      nonce: account.nonce++,
      value,
      privateKey: account.privateKey
    });
    const promise = blockchain.queueTransaction(transaction);
    return {
      transaction,
      promise
    };
  }

  function encodeProof(proof: any): string {
    return web3.eth.abi.encodeParameter(
      {
        'TransactionProof': {
          'transactionData': 'bytes',
          'siblings': 'bytes32[]'
        }
      },
      {
        transactionData: toHex(proof.transactionData),
        siblings: proof.siblings.map(toHex)
      }
    );
  }

  function encodeBlock(block: Block): string {
    return web3.eth.abi.encodeParameter({
      BlockHeader: {
        version: 'uint16',
        blockNumber: 'uint32',
        stateSize: 'uint32',
        stateRoot: 'bytes32',
        hardTransactionsCount: 'uint40',
        transactionsRoot: 'bytes32',
        transactionsHash: 'bytes32',
        submittedAt: 'uint256',
      }
    }, block.commitment);
  }

  describe(`Transaction Previous State`, async () => {
    let lastBlock: Block, block: Block, lastTransaction: SoftWithdrawal, transaction: SoftWithdrawal;
    let lastTransactionProof, transactionProof;
    let account;
  
    before(async () => {
      account = tester.randomAccount();
      await hardDeposit(account, 50);
      lastBlock = await blockchain.processBlock();
      await blockchain.submitBlock(lastBlock);
      let { transaction: t1 } = softWithdraw(account, 0, 20);
      let { transaction: t2, promise } = softWithdraw(account, 0, 20);
      lastTransaction = t1;
      transaction = t2;
      block = await blockchain.processBlock();
      await blockchain.submitBlock(block);
      await promise;
      const leaf1 = lastTransaction.encode(true);
      const leaf2 = transaction.encode(true);
      const siblings1 = getMerkleProof([leaf1, leaf2], 0).siblings;
      const siblings2 = getMerkleProof([leaf1, leaf2], 1).siblings;
      lastTransactionProof = encodeProof({ transactionData: leaf1, siblings: siblings1 });
      transactionProof = encodeProof({ transactionData: leaf2, siblings: siblings2 });
    });

    it('Should prove the state prior to the second transaction by proving the first transaction', async () => {
      const stateRoot = await blockchain.peg.methods.transactionHadPreviousState(lastTransactionProof, block.commitment, 1).call();
      expect(toHex(stateRoot)).to.eql(toHex(lastTransaction.intermediateStateRoot));
    });

    it('Should prove the state prior to the first transaction by proving the last block', async () => {
      const _block = encodeBlock(lastBlock);
      const stateRoot = await blockchain.peg.methods.transactionHadPreviousState(_block, block.commitment, 0).call();
      expect(toHex(stateRoot)).to.eql(toHex(lastBlock.commitment.stateRoot));
    });
  });
});


if (process.env.NODE_ENV != 'all' && process.env.NODE_ENV != 'coverage') test();