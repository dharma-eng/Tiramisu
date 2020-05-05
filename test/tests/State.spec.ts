import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
import Tester from '../Tester';
import { State } from '../../app';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("State Class Test", () => {
  let tester, state, account;

  before(async () => {
    ({ tester, state } = await Tester.create({ web3: false, state: true }));
    account = tester.randomAccount(50);
  });

  describe("State Creation", async () => {
    it("Should begin with state size  0", () => expect(state.size).to.eql(0));

    it("Should return null when attempting to retrieve an index for an account that hasn't been added to state", async () => {
      const index = await state.getAccountIndexByAddress(account.address);
      expect(index).to.eql(null);
    });

    it("Should return null when attempting to retrieve an account by index", async () => {
      const retrievedAccount = await state.getAccount(0);
      expect(retrievedAccount).to.eql(null);
    });
  });

  describe("Account Creation", async () => {
    it("Should put an account in the state.", async () => {
      await state.putAccount(account);
    });

    it("Should update the state size", () => expect(state.size).to.eql(1));

    it("Should save an address mapping", async () => {
      const index = await state.getAccountIndexByAddress(account.address);
      expect(index).to.eql(0);
    });

    it("Should retrieve an account", async () => {
      const retrievedAccount = await state.getAccount(0);
      expect(retrievedAccount.encode()).to.eql(account.encode());
    });

    it("Should fail to make an account with an existing address", async () => {
      const p = state.putAccount(account);
      expect(p).to.eventually.be.rejectedWith(
        `Account already exists for address ${account.address}`
      );
    });
  });

  describe('State Persistence', async () => {
    let dbPath, db: State, db2: State, rootHash: string;
    
    before(() => {
      dbPath = path.join(__dirname, 'tmp-db');
      if (fs.existsSync(dbPath)) rimraf.sync(dbPath);
      fs.mkdirSync(dbPath);
    });

    after(() => rimraf.sync(dbPath));

    it('Should restart the db and read the same data.', async () => {
      db = await State.create(dbPath);
      await db.putAccount(account);
      rootHash = await db.rootHash();
      await db.close();
      db = await State.create(dbPath, rootHash);
      expect(await db.rootHash()).to.eql(rootHash);
      expect(db.size).to.eql(1);
      expect(await db.getAccountIndexByAddress(account.address)).to.eql(0);
    });

    it('Should commit the state by root hash, then recreate the state with the same db.', async () => {
      // const root = await db.rootHash();
      await db.commit();
      db2 = await State.create(dbPath, rootHash);
      const root2 = await db2.rootHash();
      expect(root2).to.eql(rootHash);
      expect(db2.size).to.eql(1);
      expect(await db2.getAccountIndexByAddress(account.address)).to.eql(0);
    });

    it('Should update only one state, and not persist the changes to the other.', async () => {
      const account2 = tester.randomAccount();
      await db2.putAccount(account2);
      expect(await db2.rootHash()).not.to.eql(rootHash);
      expect(db2.size).to.eql(2);
      expect(await db2.getAccountIndexByAddress(account2.address)).to.eql(1);
      expect(db.size).to.eql(1);
      expect(await db.getAccountIndexByAddress(account2.address)).to.eql(null);
    });

    it('Should produce a copy when pulling a checkpointed tree.', async () => {
      db2 = await State.create(dbPath, rootHash);
      expect(await db2.rootHash()).to.eql(rootHash);
      expect(db2.size).to.eql(1);
      expect(await db2.getAccountIndexByAddress(account.address)).to.eql(0);
    })
  })
});
