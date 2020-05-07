import chai from 'chai';
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
import BlockDatabase from '../../../app/modules/db/block-database';
import { Block } from '../../../app';
import { Faker } from '../../utils';
const { expect } = chai;

describe('Test BlockDatabase', () => {
  let dbPath;
  before(() => {
    dbPath = path.join(__dirname, 'tmp-db');
    if (fs.existsSync(dbPath)) rimraf.sync(dbPath);
    fs.mkdirSync(dbPath);
  });

  after(() => {
    if (fs.existsSync(dbPath)) rimraf.sync(dbPath);
  });

  const getBlock = () => {
    const tx = Faker.hardCreate();
    tx.intermediateStateRoot = `0x${'01'.repeat(32)}`;
    const block = new Block({
      version: 2,
      blockNumber: 0,
      stateSize: 1,
      stateRoot: `0x${'01'.repeat(32)}`,
      hardTransactionsIndex: 1,
      transactions: {
        hardCreates: [tx]
      },
    });
    return block;
  }

  describe('In Memory Database', async () => {
    let db: BlockDatabase;
    let blockHash;
    it('Should write a block and read the same block', async () => {
      const block = getBlock();
      block.addOutput(0);
      db = new BlockDatabase();
      blockHash = block.blockHash();
      await db.put(blockHash, block);
      const retrievedBlock = await db.get(blockHash);
      expect(retrievedBlock.blockHash()).to.eql(blockHash);
    });

    it('Should be empty after restarting the database', async () => {
      await db.close();
      db = new BlockDatabase();
      const retrievedBlock = await db.get(blockHash);
      expect(retrievedBlock).to.eql(null);
    })
  });

  describe('Persistent Database', async () => {
    let db: BlockDatabase;
    let blockHash;
    it('Should write a block and read the same block', async () => {
      const block = getBlock();
      block.addOutput(0);
      db = new BlockDatabase(dbPath);
      blockHash = block.blockHash();
      await db.put(blockHash, block);
      const retrievedBlock = await db.get(blockHash);
      expect(retrievedBlock.blockHash()).to.eql(blockHash);
    });

    it('Should still have the block after restarting the database', async () => {
      await db.close();
      db = new BlockDatabase(dbPath);
      const retrievedBlock = await db.get(blockHash);
      expect(retrievedBlock.blockHash()).to.eql(blockHash);
    })
  })
})