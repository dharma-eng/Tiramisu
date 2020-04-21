const { expect } = require("chai");
const State = require("../../../app/state/State");
const StateMachine = require("../../../app/state/StateMachine");
const { toHex } = require("../../../app/lib/to");
const { Account, SoftCreate } = require("../../../app/types");
const { randomAccount } = require("../../utils/random");

describe("Soft Create", () => {
  let state,
    account,
    initialAccount,
    sender,
    initialSender,
    initialStateSize,
    transferAmount;

  before(async () => {
    // SET UP INITIAL STATE
    state = await State.create();
    const stateMachine = new StateMachine(state);

    const senderContract = randomAccount();
    const senderSigner = randomAccount();
    const senderInitialBalance = 100;
    initialSender = new Account({
      address: senderContract.address,
      nonce: 0,
      balance: senderInitialBalance,
      signers: [senderSigner.address]
    });
    const senderAccountIndex = await state.putAccount(initialSender);

    initialStateSize = state.size;

    // EXECUTE TRANSACTION
    const contract = randomAccount();
    const signer = randomAccount();
    transferAmount = 50;
    const initialAccountBalance = transferAmount;
    initialAccount = new Account({
      address: contract.address,
      nonce: 0,
      balance: initialAccountBalance,
      signers: [signer.address]
    });

    const softCreate = new SoftCreate({
      fromAccountIndex: senderAccountIndex,
      nonce: initialSender.nonce,
      privateKey: senderSigner.privateKey,
      toAccountIndex: initialStateSize,
      value: initialAccount.balance,
      contractAddress: initialAccount.address,
      signingAddress: signer.address
    });

    softCreate.assignResolvers(() => {}, () => {});

    await stateMachine.softCreate(softCreate);

    account = await state.getAccount(initialStateSize);
    sender = await state.getAccount(senderAccountIndex);
  });

  it("Should create an account with the expected address", async () => {
    expect(account.address).to.eql(initialAccount.address);
  });

  it("Should have created an account with nonce zero", async () => {
    expect(account.nonce).to.eql(0);
  });

  it("Should have created an account with expected balance", async () => {
    expect(account.balance).to.eql(initialAccount.balance);
  });

  it("Should have created an account with one signer with expected address", async () => {
    expect(account.signers.length).to.eql(initialAccount.signers.length);
    expect(account.hasSigner(toHex(initialAccount.signers[0]))).to.be.true;
  });

  it("Should have updated the state size", async () => {
    expect(state.size).to.eql(initialStateSize + 1);
  });

  it("Should have incremented the sender's account nonce", async () => {
    expect(sender.nonce).to.eql(initialSender.nonce + 1);
  });

  it("Should have debited the transfer amount from the sender's balance", async () =>
    expect(sender.balance).to.eql(initialSender.balance - transferAmount));

  it("Should not have modified the sender's signers", async () => {
    expect(sender.signers.length).to.eql(initialSender.signers.length);
    for (let signer of initialSender.signers) {
      expect(sender.hasSigner(toHex(signer))).to.be.true;
    }
  });
});
