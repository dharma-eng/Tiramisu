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
  Transactions,
  encodeTransactions,
  decodeTransactionsData
} from '../../../app';
import { randomAccount, randomHexBuffer } from '../../utils/random';

const { expect } = chai;


export const test = () => describe('Transactions', () => {
  describe('Transactions Coder', () => {
    let bytes: Buffer;
    it('Should encode a Transactions object', () => {
      let acct = randomAccount();
      let acct2 = randomAccount();
      let addr = acct.address;
      let addr2 = acct2.address;
      const transactions: Transactions = {
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
      const { transactionsData } = encodeTransactions(transactions)
      bytes = transactionsData;
    });

    it('Should decode a transactions buffer', () => {
      const transactions = decodeTransactionsData(bytes);
      const { transactionsData } = encodeTransactions(transactions)
      expect(transactionsData.equals(bytes)).to.be.true;
    });
  });
});

export default test;
if (process.env.NODE_ENV != 'all' && process.env.NODE_ENV != 'coverage') test();