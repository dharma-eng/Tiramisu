const { expect } = require("chai");
const State = require("../../../app/state/State");
const StateMachine = require("../../../app/state/StateMachine");
const { toHex } = require("../../../app/lib/to");
const { Account, HardWithdraw } = require("../../../app/types");
const { randomAccount } = require("../../utils/random");

describe("Hard Withdraw", () => {
  let account, state, contract, signer, initialAccount, initialStateSize;
  const initialAccountBalance = 50;
  const withdrawalAmount = 25;

  before(async () => {
    // SET UP INITIAL STATE
    state = await State.create();
    const stateMachine = new StateMachine(state);

    contract = randomAccount();
    signer = randomAccount();
    initialAccount = new Account({
      address: contract.address,
      nonce: 0,
      balance: initialAccountBalance,
      signers: [signer.address]
    });
    const accountIndex = await state.putAccount(initialAccount);

    initialStateSize = state.size;

    // EXECUTE TRANSACTION
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

  it("Should not have modified the signers", async () => {
    expect(account.signers.length).to.eql(initialAccount.signers.length);
    expect(account.hasSigner(toHex(signer.address))).to.be.true;
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
