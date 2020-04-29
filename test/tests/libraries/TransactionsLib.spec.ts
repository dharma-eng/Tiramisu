import chai from 'chai';
import Tester from '../../Tester';
import {
  Block,
  HardDeposit,
  HardCreate,
  HardWithdraw,
  HardAddSigner,
  SoftTransfer,
  SoftWithdrawal,
  SoftChangeSigner,
  SoftCreate,
} from '../../../app/types';
import { toHex } from '../../../app/lib';
import { randomAccount, randomHexBuffer } from '../../utils/random';

const { expect } = chai;

export const test = () => describe('TransactionsLib', () => {
  let tester, libMock, block, machine;
  before(async () => {
    ({ tester } = await Tester.create());
    libMock = await tester.deployContract('PublicLibMock');
    machine = await tester.newStateMachine()
  });

  describe('Test transaction root derivation', async () => {
    it('Should execute a block', async () => {
      let acct = randomAccount();
      let acct2 = randomAccount();
      let addr = acct.address;
      let addr2 = acct2.address;
      const txs = {
        hardCreates: [new HardCreate({
          hardTransactionIndex: 0,
          contractAddress: addr,
          signerAddress: addr,
          value: 500
        })],
      hardDeposits: [new HardDeposit({
        accountIndex: 0,
        hardTransactionIndex: 1,
        value: 100
      })],
      hardWithdrawals: [new HardWithdraw({
        hardTransactionIndex: 2,
        accountIndex: 0,
        callerAddress: addr,
        value: 50
      })],
      hardAddSigners: [new HardAddSigner({
        accountIndex: 0,
        hardTransactionIndex: 3,
        callerAddress: addr,
        signingAddress: addr2
      })],
      softWithdrawals: [new SoftWithdrawal({
        fromAccountIndex: 0,
        withdrawalAddress: addr,
        nonce: 0,
        value: 50,
        privateKey: acct.privateKey
      })],
      softCreates: [new SoftCreate({
        fromAccountIndex: 0,
        toAccountIndex: 1,
        nonce: 1,
        value: 50,
        contractAddress: addr2,
        signingAddress: addr2,
        privateKey: acct.privateKey
      })],
      softTransfers: [new SoftTransfer({
        fromAccountIndex: 0,
        toAccountIndex: 1,
        nonce: 2,
        value: 50,
        privateKey: acct.privateKey
      })],
      softChangeSigners: [new SoftChangeSigner({
        fromAccountIndex: 0,
        nonce: 3,
        signingAddress: toHex(randomHexBuffer(20)),
        modificationCategory: 0,
        privateKey: acct.privateKey
      })]
      };
      Object.keys(txs).filter(k => /soft/g.exec(k)).map(k => txs[k][0].assignResolvers(() => {}, () => {}))
      await machine.execute(txs);
      block = new Block({
        version: 0,
        blockNumber: 0,
        stateSize: machine.state.size,
        stateRoot: await machine.state.rootHash,
        hardTransactionsIndex: 0,
        transactions: txs
      });
    })
    
    it('Should derive the tx root', async () => {
      const txRoot = await libMock.methods.deriveTransactionsRoot(block.transactionsData).call();
      expect(txRoot).to.eql(`0x${block.header.transactionsRoot.toString('hex')}`)
    })
  })
});

if (process.env.NODE_ENV != 'all' && process.env.NODE_ENV != 'coverage') test();