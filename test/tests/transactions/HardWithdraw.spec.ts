import { expect } from 'chai';
import { State, StateMachine, Account, HardWithdraw, toHex } from '../../../app';
import { randomAccount } from '../../utils';

const test = () =>describe("Hard Withdraw", () => {
  let state, stateMachine, account, accountIndex, initialAccount, initialStateSize, withdrawalAmount, transactions;

  before(async () => {
    // SET UP INITIAL STATE
    state = await State.create();
    stateMachine = new StateMachine(state);

    const contract = randomAccount();
    const signer = randomAccount();
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

  describe("Simple Hard Withdraw", () => {
    let hardWithdrawal;

    before(async () => {
      initialAccount = await state.getAccount(accountIndex);
      // EXECUTE TRANSACTION
      withdrawalAmount = 25;

      hardWithdrawal = new HardWithdraw({
        accountIndex,
        hardTransactionIndex: 0,
        callerAddress: initialAccount.address,
        value: withdrawalAmount
      });

      transactions = {
        hardWithdrawals: [hardWithdrawal]
      };
    });

    it("Should execute a hard withdrawal", async () => {
      await stateMachine.execute(transactions);
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

    it("Should not have updated the account nonce", async () => {
      expect(account.nonce).to.eql(initialAccount.nonce);
    });

    it("Should not have updated the state size", async () => {
      expect(state.size).to.eql(initialStateSize);
    });

    it("Should encode the transaction to the correct number of byes", async () => {
      let encoded = hardWithdrawal.encode(true);
      expect(encoded.length).to.eql(hardWithdrawal.bytesWithoutPrefix + 1);

      encoded = hardWithdrawal.encode(false);
      expect(encoded.length).to.eql(hardWithdrawal.bytesWithoutPrefix);
    });
  });

  describe("Withdraw more than account balance", () => {
    let hardWithdrawal;

    before(async () => {
      initialAccount = await state.getAccount(accountIndex);
      // EXECUTE TRANSACTION
      withdrawalAmount = initialAccount.balance + 1;

      hardWithdrawal = new HardWithdraw({
        accountIndex,
        hardTransactionIndex: 0,
        callerAddress: initialAccount.address,
        value: withdrawalAmount
      });

      transactions = {
        hardWithdrawals: [hardWithdrawal]
      };
    });

    it("Should not execute the hard withdrawal", async () => {
      const valid = hardWithdrawal.checkValid(initialAccount);
      expect(valid).to.eql("Account has insufficient balance for withdrawal.");

      await stateMachine.execute(transactions);
    });

    it("Should have kept the account at the same index", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should not have changed the account balance", async () => {
      expect(account.balance).to.eql(initialAccount.balance);
    });

    it("Should not have updated the account nonce", async () => {
      expect(account.nonce).to.eql(initialAccount.nonce);
    });
  });

  describe("Withdraw from caller that isn't approved", () => {
    let hardWithdrawal;

    before(async () => {
      initialAccount = await state.getAccount(accountIndex);
      // EXECUTE TRANSACTION
      withdrawalAmount = initialAccount.balance / 2;

      const badCaller = randomAccount();

      hardWithdrawal = new HardWithdraw({
        accountIndex,
        hardTransactionIndex: 0,
        callerAddress: badCaller.address,
        value: withdrawalAmount
      });

      transactions = {
        hardWithdrawals: [hardWithdrawal]
      };
    });

    it("Should not execute the hard withdrawal", async () => {
      const valid = hardWithdrawal.checkValid(initialAccount);
      expect(valid).to.eql("Caller not approved for withdrawal.");

      await stateMachine.execute(transactions);
    });

    it("Should have kept the account at the same index", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should not have changed the account balance", async () => {
      expect(account.balance).to.eql(initialAccount.balance);
    });

    it("Should not have updated the account nonce", async () => {
      expect(account.nonce).to.eql(initialAccount.nonce);
    });
  });
});

export default test;
if (process.env.NODE_ENV != "all") test();


