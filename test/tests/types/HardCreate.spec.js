const { expect } = require("chai");
const State = require("../../../app/state/State");
const StateMachine = require("../../../app/state/StateMachine");
const { toHex } = require("../../../app/lib/to");
const { Account, HardCreate } = require("../../../app/types");
const { randomAccount } = require("../../utils/random");

describe("Hard Create", () => {
  let state, account, initialAccount, initialStateSize;

  before(async () => {
    // SET UP INITIAL STATE
    state = await State.create();
    const stateMachine = new StateMachine(state);

    const firstAccountContract = randomAccount();
    const firstAccountSigner = randomAccount();
    const firstAccountBalance = 100;
    const firstAccount = new Account({
      address: firstAccountContract.address,
      nonce: 0,
      balance: firstAccountBalance,
      signers: [firstAccountSigner.address]
    });
    const accountIndex = await state.putAccount(firstAccount);

    initialStateSize = state.size;

    // EXECUTE TRANSACTION
    const contract = randomAccount();
    const signer = randomAccount();
    const initialAccountBalance = 50;
    initialAccount = new Account({
      address: contract.address,
      nonce: 0,
      balance: initialAccountBalance,
      signers: [signer.address]
    });

    const hardCreate = new HardCreate({
      hardTransactionIndex: 0,
      contractAddress: initialAccount.address,
      signerAddress: signer.address,
      value: initialAccount.balance
    });

    await stateMachine.hardCreate(hardCreate);

    account = await state.getAccount(initialStateSize);
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
});
