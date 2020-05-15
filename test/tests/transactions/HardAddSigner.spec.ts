import { expect } from 'chai';
import { State, StateMachine, Account, HardAddSigner, toHex } from '../../../app';
import { randomAccount } from '../../utils';

const test = () => describe("Hard Add Signer", () => {
  let state, stateMachine, accountIndex, initialAccount, initialStateSize;

  before(async () => {
    // SET UP INITIAL STATE
    state = await State.create();
    stateMachine = new StateMachine(state);

    const contract = randomAccount();
    const signer = randomAccount();
    const initialAccountBalance = 100;
    initialAccount = new Account({
      address: contract.address,
      nonce: 0,
      balance: initialAccountBalance,
      signers: [signer.address]
    });
    accountIndex = await state.putAccount(initialAccount);

    initialStateSize = state.size;
  });

  describe("Simple Add Signer", async () => {
    let newSigner, account, hardAddSigner, transactions;

    before(async () => {
      // EXECUTE TRANSACTION
      newSigner = randomAccount();

      hardAddSigner = new HardAddSigner({
        accountIndex,
        hardTransactionIndex: 0,
        callerAddress: initialAccount.address,
        signingAddress: newSigner.address
      });

      transactions = {
        hardAddSigners: [hardAddSigner]
      };
    });

    it("Should be able to add a signer", async () => {
      await stateMachine.execute(transactions);
    });

    it("Should be able to retrieve the account at accountIndex", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should have added one signer", async () => {
      expect(account.signers.length).to.eql(initialAccount.signers.length + 1);
    });

    it("Should have added the expected signer", async () => {
      expect(account.hasSigner(toHex(newSigner.address))).to.be.true;
    });

    it("Should have all of the signers that the initial account had", async () => {
      for (let signer of initialAccount.signers) {
        expect(account.hasSigner(toHex(signer))).to.be.true;
      }
    });

    it("Should not have modified the account balance", async () => {
      expect(account.balance).to.eql(initialAccount.balance);
    });

    it("Should not have updated the account nonce", async () => {
      expect(account.nonce).to.eql(initialAccount.nonce);
    });

    it("Should not have updated the state size", async () => {
      expect(state.size).to.eql(initialStateSize);
    });

    it("Should be able to encode the transaction", async () => {
      let encoded = hardAddSigner.encode(true);
      expect(encoded.length).to.eql(hardAddSigner.bytesWithoutPrefix + 1);

      encoded = hardAddSigner.encode(false);
      expect(encoded.length).to.eql(hardAddSigner.bytesWithoutPrefix);
    });
  });

  describe("Double-Add The Same Signer", async () => {
    let newSigner, account, hardAddSigner, transactions;

    before(async () => {
      initialAccount = await state.getAccount(accountIndex);

      // EXECUTE TRANSACTION
      newSigner = randomAccount();

      hardAddSigner = new HardAddSigner({
        accountIndex,
        hardTransactionIndex: 0,
        callerAddress: initialAccount.address,
        signingAddress: newSigner.address
      });

      transactions = {
        hardAddSigners: [hardAddSigner]
      };
    });

    it("Should be able to add the signer once", async () => {
      await stateMachine.execute(transactions);
    });

    it("Should not be able to add the signer again", async () => {
      await stateMachine.execute(transactions);
      account = await state.getAccount(accountIndex);
      const valid = hardAddSigner.checkValid(account);
      expect(valid).to.eql(`Invalid signing address. Account already has signer ${newSigner.address}`);
    });

    it("Should be able to retrieve the account at accountIndex", async () => {
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should have added one signer", async () => {
      expect(account.signers.length).to.eql(initialAccount.signers.length + 1);
    });

    it("Should have added the expected signer", async () => {
      expect(account.hasSigner(toHex(newSigner.address))).to.be.true;
    });

    it("Should have all of the signers that the initial account had", async () => {
      for (let signer of initialAccount.signers) {
        expect(account.hasSigner(toHex(signer))).to.be.true;
      }
    });

    it("Should not have updated the account nonce", async () => {
      expect(account.nonce).to.eql(initialAccount.nonce);
    });
  });

  describe("Add Signer from Incorrect Caller", async () => {
    let newSigner, account, hardAddSigner, transactions;

    before(async () => {
      initialAccount = await state.getAccount(accountIndex);

      // EXECUTE TRANSACTION
      newSigner = randomAccount();

      hardAddSigner = new HardAddSigner({
        accountIndex,
        hardTransactionIndex: 0,
        callerAddress: newSigner.address,
        signingAddress: newSigner.address
      });

      transactions = {
        hardAddSigners: [hardAddSigner]
      };
    });

    it("Should not be able to add the signer", async () => {
      await stateMachine.execute(transactions); //TODO: figure out how to confirm that this didn't execute from return results

      const valid = hardAddSigner.checkValid(initialAccount);
      expect(valid).to.eql("Caller not approved.");
    });

    it("Should be able to retrieve the account at accountIndex", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should not have added any signers", async () => {
      expect(account.signers.length).to.eql(initialAccount.signers.length);
      expect(account.hasSigner(toHex(newSigner.address))).to.be.false;
    });

    it("Should have all of the signers that the initial account had", async () => {
      for (let signer of initialAccount.signers) {
        expect(account.hasSigner(toHex(signer))).to.be.true;
      }
    });

    it("Should not have updated the account nonce", async () => {
      expect(account.nonce).to.eql(initialAccount.nonce);
    });
  });

  describe("Add more than 10 signers ", async () => {
    let newSigner, account, hardAddSigner, transactions;

    before(async () => {
      initialAccount = await state.getAccount(accountIndex);
    });

    it("Should be able to add 10 signers", async () => {
      let numSigners = initialAccount.signers.length;

      while (numSigners < 10) {
        initialAccount = await state.getAccount(accountIndex);

        newSigner = randomAccount();

        hardAddSigner = new HardAddSigner({
          accountIndex,
          hardTransactionIndex: 0,
          callerAddress: initialAccount.address,
          signingAddress: newSigner.address
        });

        transactions = {
          hardAddSigners: [hardAddSigner]
        };

        await stateMachine.execute(transactions);

        account = await state.getAccount(accountIndex);
        expect(account.hasSigner(toHex(newSigner.address))).to.be.true;
        expect(account.signers.length).to.eql(initialAccount.signers.length + 1);

        numSigners = account.signers.length;
      }
    });

    it("Should fail to add an 11th signer", async () => {
      initialAccount = await state.getAccount(accountIndex);
      newSigner = randomAccount();

      hardAddSigner = new HardAddSigner({
        accountIndex,
        hardTransactionIndex: 0,
        callerAddress: initialAccount.address,
        signingAddress: newSigner.address
      });

      transactions = {
        hardAddSigners: [hardAddSigner]
      };

      await stateMachine.execute(transactions);

      account = await state.getAccount(accountIndex);
      expect(account.hasSigner(toHex(newSigner.address))).to.be.false;

      const valid = hardAddSigner.checkValid(initialAccount);
      expect(valid).to.eql("Account signer array full.");

      expect(account.signers.length).to.eql(initialAccount.signers.length);
    });
  });

  describe("Encode and decode", () => {
    let bytes: Buffer;
    it('Should encode a transaction without the prefix', () => {
      const newSigner = randomAccount();
      const hardAddSigner = new HardAddSigner({
        accountIndex,
        hardTransactionIndex: 0,
        callerAddress: initialAccount.address,
        signingAddress: newSigner.address
      });
      bytes = hardAddSigner.encode();
      console.log(bytes)
    });

    it('Should decode the transaction', () => {
      const hardAddSigner = HardAddSigner.decode(bytes);
      expect(hardAddSigner.encode().equals(bytes)).to.be.true;
    });
  });
});

export default test;
if (process.env.NODE_ENV != 'all' && process.env.NODE_ENV != 'coverage') test();
