import chai from 'chai';
const fs = require('fs');
const path = require('path');
import chaiAsPromised from 'chai-as-promised';
import Tester from '../../Tester';
chai.use(chaiAsPromised);
const { expect } = chai;

import { ErrorBuilder, TransactionType, HardTransactionSourceError, InducedBlockError } from '../../utils/error-builder';
import rimraf from 'rimraf';
import { ErrorProof } from '../../../app/modules/auditor/types';

export const test = () => describe('Auditor Tests', () => {
  let _dbPath: string;
  before(() => {
    _dbPath = path.join(__dirname, 'tmp-db');
  })

  const makeIfNotExist = (str: string) => {
    if (!fs.existsSync(str)) fs.mkdirSync(str);
  }

  const buildPath = (relPaths: string[]) => {
    let _path = '' + _dbPath;
    makeIfNotExist(_path);
    for (let p of relPaths) {
      _path = path.join(_path, p);
      makeIfNotExist(_path);
    }
    return _path;
  }

  describe('Catches all hard transaction source errors.', async () => {
    const testTypeWithSourceError = (txType: TransactionType, sourceError: HardTransactionSourceError) =>
    describe(`Hard Transaction Source Auditing: ${txType.valueOf()} ${sourceError}`, () => {
      let dbPath: string;
      let web3: any, peg: any, from: string;
      let builder: ErrorBuilder;
      let proof: ErrorProof;
      
      before(async () => {
        ({ web3, peg, from } = await Tester.create());
        dbPath = buildPath([sourceError.toString(), txType.toString()])
        builder = await ErrorBuilder.create(web3, peg, from, dbPath);
      });
  
      after(async () => {
        await builder.closeAndDelete();
        builder = null;
        rimraf.sync(_dbPath);
      })
    
      it('Should give a hard transaction source error', async () => {
        proof = await builder.buildWithSourceError(txType, sourceError);
      });

      it('Should prove the error to the chain peg', async () => {
        const blockNum = await builder.parentInterface.currentPegBlockNumber();
        await builder.auditor.proveError(proof);
        const newBlockNum = await builder.parentInterface.currentPegBlockNumber();
        expect(newBlockNum).to.eq(blockNum - 1);
      });
    });

    const hardCreateTypes = [`source_value`, `source_address`, `source_signer`];
    const hardDepositTypes = [`source_value`, `source_index`];
    const hardWithdrawTypes = [`source_value`, `source_caller`, `source_index`];
    const hardAddSignerTypes = [`source_index`, `source_caller`, `source_signer`];
    await Promise.all(hardCreateTypes.map((_type, i) => testTypeWithSourceError(
      TransactionType.HARD_CREATE,
      _type as HardTransactionSourceError,
      // i
    )));
    await Promise.all(hardDepositTypes.map((_type, i) => testTypeWithSourceError(
      TransactionType.HARD_DEPOSIT,
      _type as HardTransactionSourceError,
      // i
    )));
    await Promise.all(hardWithdrawTypes.map((_type, i) => testTypeWithSourceError(
      TransactionType.HARD_WITHDRAW,
      _type as HardTransactionSourceError,
      // i
    )));
    await Promise.all(hardAddSignerTypes.map((_type, i) => testTypeWithSourceError(
      TransactionType.HARD_ADD_SIGNER,
      _type as HardTransactionSourceError,
      // i
    )));
  });

  describe('Catches all signature errors', async () => {
    const testTypeWithSignatureError = (txType: TransactionType, index: number) =>
    describe(`Soft Transaction Signature Auditing: ${txType.valueOf()}`, async () => {
      let dbPath: string;
      let web3: any, peg: any, from: string;
      let builder: ErrorBuilder;
      let proof: ErrorProof;
      
      before(async () => {
        ({ web3, peg, from } = await Tester.create());
        dbPath = buildPath([index.toString(), txType.toString()])
        builder = await ErrorBuilder.create(web3, peg, from, dbPath);
      });
  
      after(async () => {
        await builder.closeAndDelete();
        builder = null;
        rimraf.sync(_dbPath);
      })
    
      it('Should identify a soft transaction signature error', async () => {
        proof = await builder.buildWithSignatureError(txType);
      });

      it('Should prove the error to the chain peg', async () => {
        const blockNum = await builder.parentInterface.currentPegBlockNumber();
        await builder.auditor.proveError(proof);
        const newBlockNum = await builder.parentInterface.currentPegBlockNumber();
        expect(newBlockNum).to.eq(blockNum - 1);
      });
    });

    await testTypeWithSignatureError(TransactionType.SOFT_WITHDRAW, 0);
    await testTypeWithSignatureError(TransactionType.SOFT_CREATE, 1);
    await testTypeWithSignatureError(TransactionType.SOFT_TRANSFER, 2);
  });

  describe('Catches all execution errors', async () => {
    const testTypeWithExecutionError = (txType: TransactionType, index: number) =>
    describe(`Transaction Execution Auditing: ${txType.valueOf()}`, async () => {
      let dbPath: string;
      let web3: any, peg: any, from: string;
      let builder: ErrorBuilder;
      let proof: ErrorProof;
      
      before(async () => {
        ({ web3, peg, from } = await Tester.create());
        dbPath = buildPath([index.toString(), txType.toString()])
        builder = await ErrorBuilder.create(web3, peg, from, dbPath);
      });
  
      after(async () => {
        await builder.closeAndDelete();
        builder = null;
        rimraf.sync(_dbPath);
      })
    
      it(`Should give a ${txType} error`, async () => {
        proof = await builder.buildWithExecutionError(txType);
      });

      it('Should prove the error to the chain peg', async () => {
        const blockNum = await builder.parentInterface.currentPegBlockNumber();
        await builder.auditor.proveError(proof);
        const newBlockNum = await builder.parentInterface.currentPegBlockNumber();
        expect(newBlockNum).to.eq(blockNum - 1);
      });
    });
    await testTypeWithExecutionError(TransactionType.HARD_CREATE, 0);
    await testTypeWithExecutionError(TransactionType.HARD_DEPOSIT, 1);
    await testTypeWithExecutionError(TransactionType.HARD_WITHDRAW, 2);
    await testTypeWithExecutionError(TransactionType.HARD_ADD_SIGNER, 3);
    await testTypeWithExecutionError(TransactionType.SOFT_WITHDRAW, 4);
    await testTypeWithExecutionError(TransactionType.SOFT_CREATE, 5);
    await testTypeWithExecutionError(TransactionType.SOFT_TRANSFER, 6);
  });

  describe('Catches all block errors', async () => {
    const testTypeWithBlockError = (errType: InducedBlockError) =>
    describe(`Block Auditing: ${errType.valueOf()}`, async () => {
      let dbPath: string;
      let web3: any, peg: any, from: string;
      let builder: ErrorBuilder;
      let proof: ErrorProof;
      
      before(async () => {
        ({ web3, peg, from } = await Tester.create());
        dbPath = buildPath([errType.toString()])
        builder = await ErrorBuilder.create(web3, peg, from, dbPath);
      });
  
      after(async () => {
        await builder.closeAndDelete();
        builder = null;
        rimraf.sync(_dbPath);
      })
    
      it(`Should give a ${errType} error`, async () => {
        proof = await builder.buildWithBlockError(errType);
      });

      it('Should prove the error to the chain peg', async () => {
        const blockNum = await builder.parentInterface.currentPegBlockNumber();
        await builder.auditor.proveError(proof);
        const newBlockNum = await builder.parentInterface.currentPegBlockNumber();
        expect(newBlockNum).to.eq(blockNum - 1);
      });
    });
    await testTypeWithBlockError('state_size');
    await testTypeWithBlockError('state_root');
    await testTypeWithBlockError('transactions_root');
    await testTypeWithBlockError('hard_transactions_count');
    await testTypeWithBlockError('hard_transactions_range');
    await testTypeWithBlockError('hard_transactions_order');
    await testTypeWithBlockError('transactions_length');
  })
});

if (process.env.NODE_ENV != 'coverage') test();