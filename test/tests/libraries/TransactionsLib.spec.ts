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
  toHex,
  sliceBuffer
} from '../../../app';
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
          accountAddress: addr,
          initialSigningKey: addr,
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
        accountIndex: 0,
        withdrawalAddress: addr,
        nonce: 0,
        value: 50,
        privateKey: acct.privateKey
      })],
      softCreates: [new SoftCreate({
        accountIndex: 0,
        toAccountIndex: 1,
        nonce: 1,
        value: 50,
        accountAddress: addr2,
        initialSigningKey: addr2,
        privateKey: acct.privateKey
      })],
      softTransfers: [new SoftTransfer({
        accountIndex: 0,
        toAccountIndex: 1,
        nonce: 2,
        value: 50,
        privateKey: acct.privateKey
      })],
      softChangeSigners: [new SoftChangeSigner({
        accountIndex: 0,
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

  describe('Test recoverSignature', async () => {
    let acct1, acct2, addr1, addr2;
    before(() => {
      acct1 = randomAccount();
      acct2 = randomAccount();
      addr1 = acct1.address;
      addr2 = acct2.address;
    })

    describe('Soft Withdrawal', async () => {
      let transaction: SoftWithdrawal;
      before(() => {
        transaction = new SoftWithdrawal({
          accountIndex: 0,
          withdrawalAddress: addr1,
          nonce: 0,
          value: 50,
          privateKey: acct1.privateKey
        });
      })
      
      it('Should recover the signature of a valid transaction', async () => {
        const address = await libMock.methods.recoverSignature(transaction.encode(true)).call();
        expect(address.toLowerCase()).to.eq(addr1.toLowerCase());
      });
      
      it('Should recover a null signature for an invalid transaction', async () => {
        const data = transaction.encode(true);
        const address = await libMock.methods.recoverSignature(sliceBuffer(data, 0, data.length - 1)).call();
        expect(address).to.eq(`0x${'00'.repeat(20)}`);
      });
    });

    describe('Soft Create', async () => {
      let transaction: SoftCreate;
      before(() => {
        transaction = new SoftCreate({
          accountIndex: 0,
          toAccountIndex: 1,
          nonce: 1,
          value: 50,
          accountAddress: addr2,
          initialSigningKey: addr2,
          privateKey: acct1.privateKey
        })
      })
      
      it('Should recover the signature of a valid transaction', async () => {
        const address = await libMock.methods.recoverSignature(transaction.encode(true)).call();
        expect(address.toLowerCase()).to.eq(addr1.toLowerCase());
      });
      
      it('Should recover a null signature for an invalid transaction', async () => {
        const data = transaction.encode(true);
        const address = await libMock.methods.recoverSignature(sliceBuffer(data, 0, data.length - 1)).call();
        expect(address).to.eq(`0x${'00'.repeat(20)}`);
      });
    })

    describe('Soft Transfer', async () => {
      let transaction: SoftTransfer;

      before(() => {
        transaction = new SoftTransfer({
          accountIndex: 0,
          toAccountIndex: 1,
          nonce: 2,
          value: 50,
          privateKey: acct1.privateKey
        })
      });
      
      it('Should recover the signature of a valid transaction', async () => {
        const address = await libMock.methods.recoverSignature(transaction.encode(true)).call();
        expect(address.toLowerCase()).to.eq(addr1.toLowerCase());
      });
      
      it('Should recover a null signature for an invalid transaction', async () => {
        const data = transaction.encode(true);
        const address = await libMock.methods.recoverSignature(sliceBuffer(data, 0, data.length - 1)).call();
        expect(address).to.eq(`0x${'00'.repeat(20)}`);
      });
    });

    describe('Soft Change Signer', async () => {
      let transaction: SoftChangeSigner;
      before(() => {
        transaction = new SoftChangeSigner({
          accountIndex: 0,
          nonce: 3,
          signingAddress: toHex(randomHexBuffer(20)),
          modificationCategory: 0,
          privateKey: acct1.privateKey
        });
      });
      
      it('Should recover the signature of a valid transaction', async () => {
        const address = await libMock.methods.recoverSignature(transaction.encode(true)).call();
        expect(address.toLowerCase()).to.eq(addr1.toLowerCase());
      });
      
      it('Should recover a null signature for an invalid transaction', async () => {
        const data = transaction.encode(true);
        const address = await libMock.methods.recoverSignature(sliceBuffer(data, 0, data.length - 1)).call();
        expect(address).to.eq(`0x${'00'.repeat(20)}`);
      });
    })
  })
});

if (process.env.NODE_ENV != 'all' && process.env.NODE_ENV != 'coverage') test();
