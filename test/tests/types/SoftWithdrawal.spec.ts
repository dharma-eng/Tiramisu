import { expect } from 'chai';
import { State, StateMachine, Account, SoftWithdrawal, toHex } from '../../../app';
import { randomAccount } from '../../utils';

describe("Hard Withdraw", () => {
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
    withdrawalAmount = 19;
    const withdrawalAccount = randomAccount();

    const softWithdrawal = new SoftWithdrawal({
      fromAccountIndex: accountIndex,
      withdrawalAddress: withdrawalAccount.address,
      nonce: initialAccount.nonce,
      value: withdrawalAmount,
      privateKey: signer.privateKey
    });

    softWithdrawal.assignResolvers(() => {}, () => {});

    await stateMachine.softWithdrawal(softWithdrawal);
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

  it("Should have incremented the account's account nonce", async () => {
    expect(account.nonce).to.eql(initialAccount.nonce + 1);
  });

  it("Should not have updated the state size", async () => {
    expect(state.size).to.eql(initialStateSize);
  });
});
