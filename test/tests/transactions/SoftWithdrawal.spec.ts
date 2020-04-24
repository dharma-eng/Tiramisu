import { expect } from 'chai';
import { State, StateMachine, Account, SoftWithdrawal, toHex } from '../../../app';
import { randomAccount } from '../../utils';

const test = () => describe("Soft Withdraw", () => {
  let state, stateMachine, account, accountIndex, initialAccount, signer, initialStateSize;

  before(async () => {
    // SET UP INITIAL STATE
    state = await State.create();
    stateMachine = new StateMachine(state);

    const contract = randomAccount();
    signer = randomAccount();
    const initialAccountBalance = 50;
    initialAccount = new Account({
      address: contract.address,
      nonce: 0,
      balance: initialAccountBalance,
      signers: [signer.address]
    });
    accountIndex = await state.putAccount(initialAccount);

    initialStateSize = state.size;
  });

  describe("Valid Soft Withdraw", () => {
    let withdrawalAmount, softWithdrawal;
    before(async () => {
      initialStateSize = state.size;
      initialAccount = await state.getAccount(accountIndex);
      // EXECUTE TRANSACTION
      withdrawalAmount = initialAccount.balance / 5;
      const withdrawalAccount = randomAccount();

      softWithdrawal = new SoftWithdrawal({
        fromAccountIndex: accountIndex,
        withdrawalAddress: withdrawalAccount.address,
        nonce: initialAccount.nonce,
        value: withdrawalAmount,
        privateKey: signer.privateKey
      });

      softWithdrawal.assignResolvers(() => {}, () => {});
    });

    it("Should execute the soft withdrawal", async () => {
      const res = await stateMachine.softWithdrawal(softWithdrawal);
      expect(res).to.be.true;
    });

    it("Should have kept the account at the same index", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should not have modified the account's signers", async () => {
      expect(account.signers.length).to.eql(initialAccount.signers.length);
      for (let signer of initialAccount.signers) {
        expect(account.hasSigner(toHex(signer))).to.be.true;
      }
      expect(account.signers).to.eql(initialAccount.signers);
    });

    it("Should have withdrawn the amount from the account", async () => {
      expect(account.balance).to.eql(initialAccount.balance - withdrawalAmount);
    });

    it("Should have incremented the account's account nonce", async () => {
      expect(account.nonce).to.eql(initialAccount.nonce + 1);
    });

    it("Should not have updated the state size", async () => {
      expect(state.size).to.eql(initialStateSize);
    });

    it("Should encode the transaction to the correct number of byes", async () => {
      let encoded = softWithdrawal.encode(true);
      expect(encoded.length).to.eql(softWithdrawal.bytesWithoutPrefix + 1);

      encoded = softWithdrawal.encode(false);
      expect(encoded.length).to.eql(softWithdrawal.bytesWithoutPrefix);
    });
  });

  describe("Invalid Signature", () => {
    let withdrawalAmount, softWithdrawal;
    before(async () => {
      initialStateSize = state.size;
      initialAccount = await state.getAccount(accountIndex);
      // EXECUTE TRANSACTION
      withdrawalAmount = initialAccount.balance / 5;
      const withdrawalAccount = randomAccount();

      const badSigner = randomAccount();
      softWithdrawal = new SoftWithdrawal({
        fromAccountIndex: accountIndex,
        withdrawalAddress: withdrawalAccount.address,
        nonce: initialAccount.nonce,
        value: withdrawalAmount,
        privateKey: badSigner.privateKey
      });

      softWithdrawal.assignResolvers(() => {}, () => {});
    });

    it("Should not execute the soft withdrawal", async () => {
      const res = await stateMachine.softWithdrawal(softWithdrawal);
      expect(res).to.be.false;

      const valid = softWithdrawal.checkValid(initialAccount);
      expect(valid).to.eql("Invalid signature.");
    });

    it("Should have kept the account at the same index", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should not have modified the account's signers", async () => {
      expect(account.signers.length).to.eql(initialAccount.signers.length);
      for (let signer of initialAccount.signers) {
        expect(account.hasSigner(toHex(signer))).to.be.true;
      }
      expect(account.signers).to.eql(initialAccount.signers);
    });

    it("Should not have withdrawn the amount from the account", async () => {
      expect(account.balance).to.eql(initialAccount.balance);
    });

    it("Should not have incremented the account's account nonce", async () => {
      expect(account.nonce).to.eql(initialAccount.nonce);
    });

    it("Should not have updated the state size", async () => {
      expect(state.size).to.eql(initialStateSize);
    });
  });

  describe("Invalid Nonce", () => {
    let withdrawalAmount, softWithdrawal;
    before(async () => {
      initialStateSize = state.size;
      initialAccount = await state.getAccount(accountIndex);
      // EXECUTE TRANSACTION
      withdrawalAmount = initialAccount.balance / 5;
      const withdrawalAccount = randomAccount();

      softWithdrawal = new SoftWithdrawal({
        fromAccountIndex: accountIndex,
        withdrawalAddress: withdrawalAccount.address,
        nonce: initialAccount.nonce + 1,
        value: withdrawalAmount,
        privateKey: signer.privateKey
      });

      softWithdrawal.assignResolvers(() => {}, () => {});
    });

    it("Should not execute the soft withdrawal", async () => {
      const res = await stateMachine.softWithdrawal(softWithdrawal);
      expect(res).to.be.false;

      const valid = softWithdrawal.checkValid(initialAccount);
      expect(valid).to.eql(`Invalid nonce. Expected ${initialAccount.nonce}`);
    });

    it("Should have kept the account at the same index", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should not have modified the account's signers", async () => {
      expect(account.signers.length).to.eql(initialAccount.signers.length);
      for (let signer of initialAccount.signers) {
        expect(account.hasSigner(toHex(signer))).to.be.true;
      }
      expect(account.signers).to.eql(initialAccount.signers);
    });

    it("Should not have withdrawn the amount from the account", async () => {
      expect(account.balance).to.eql(initialAccount.balance);
    });

    it("Should not have incremented the account's account nonce", async () => {
      expect(account.nonce).to.eql(initialAccount.nonce);
    });

    it("Should not have updated the state size", async () => {
      expect(state.size).to.eql(initialStateSize);
    });
  });

  describe("Insufficient Balance", () => {
    let withdrawalAmount, softWithdrawal;
    before(async () => {
      initialStateSize = state.size;
      initialAccount = await state.getAccount(accountIndex);
      // EXECUTE TRANSACTION
      withdrawalAmount = initialAccount.balance + 5;
      const withdrawalAccount = randomAccount();

      softWithdrawal = new SoftWithdrawal({
        fromAccountIndex: accountIndex,
        withdrawalAddress: withdrawalAccount.address,
        nonce: initialAccount.nonce,
        value: withdrawalAmount,
        privateKey: signer.privateKey
      });

      softWithdrawal.assignResolvers(() => {}, () => {});
    });

    it("Should not execute the soft withdrawal", async () => {
      const res = await stateMachine.softWithdrawal(softWithdrawal);
      expect(res).to.be.false;

      const valid = softWithdrawal.checkValid(initialAccount);
      expect(valid).to.eql(`Insufficient balance. Account has ${initialAccount.balance}.`);
    });

    it("Should have kept the account at the same index", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should not have modified the account's signers", async () => {
      expect(account.signers.length).to.eql(initialAccount.signers.length);
      for (let signer of initialAccount.signers) {
        expect(account.hasSigner(toHex(signer))).to.be.true;
      }
      expect(account.signers).to.eql(initialAccount.signers);
    });

    it("Should not have withdrawn the amount from the account", async () => {
      expect(account.balance).to.eql(initialAccount.balance);
    });

    it("Should not have incremented the account's account nonce", async () => {
      expect(account.nonce).to.eql(initialAccount.nonce);
    });

    it("Should not have updated the state size", async () => {
      expect(state.size).to.eql(initialStateSize);
    });
  });


});

export default test;
if (process.env.NODE_ENV != "all") test();
