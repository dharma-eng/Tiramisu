const { expect } = require("chai");
const State = require("../../../app/state/State");
const StateMachine = require("../../../app/state/StateMachine");
const { toHex } = require("../../../app/lib/to");
const { Account, HardAddSigner } = require("../../../app/types");
const { randomAccount } = require("../../utils/random");

describe("Hard Add Signer", () => {
  let state, account, initialAccount, initialStateSize, newSigner;

  before(async () => {
    // SET UP INITIAL STATE
    state = await State.create();
    const stateMachine = new StateMachine(state);

    const contract = randomAccount();
    const signer = randomAccount();
    const initialAccountBalance = 100;
    initialAccount = new Account({
      address: contract.address,
      nonce: 0,
      balance: initialAccountBalance,
      signers: [signer.address]
    });
    const accountIndex = await state.putAccount(initialAccount);

    initialStateSize = state.size;

    // EXECUTE TRANSACTION
    newSigner = randomAccount();

    const hardAddSigner = new HardAddSigner({
      accountIndex,
      hardTransactionIndex: 0,
      callerAddress: initialAccount.address,
      signingAddress: newSigner.address
    });

    await stateMachine.hardAddSigner(hardAddSigner);

    account = await state.getAccount(accountIndex);
  });

  it("Should have kept the account at the same index", async () => {
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
});
