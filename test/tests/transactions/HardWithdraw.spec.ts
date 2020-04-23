import { expect } from 'chai';
import { State, StateMachine, Account, HardWithdraw, toHex } from '../../../app';
import { randomAccount } from '../../utils';

const test = () =>describe("Hard Withdraw", () => {
  let state, account, initialAccount, initialStateSize, withdrawalAmount;

  before(async () => {
    // SET UP INITIAL STATE
    state = await State.create();
    const stateMachine = new StateMachine(state);

    const contract = randomAccount();
    const signer = randomAccount();
    const initialAccountBalance = 50;
    initialAccount = new Account({
      address: contract.address,
      nonce: 0,
      balance: initialAccountBalance,
      signers: [signer.address]
    });
    const accountIndex = await state.putAccount(initialAccount);

    initialStateSize = state.size;

    // EXECUTE TRANSACTION
    withdrawalAmount = 25;

    const hardWithdrawal = new HardWithdraw({
      accountIndex,
      hardTransactionIndex: 0,
      callerAddress: initialAccount.address,
      value: withdrawalAmount
    });

    await stateMachine.hardWithdraw(hardWithdrawal);
    account = await state.getAccount(accountIndex);
  });

  it("Should have kept the account at the same index", async () => {
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
});

export default test;
if (process.env.NODE_ENV != "all") test();