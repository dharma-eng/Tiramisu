import { expect } from 'chai';
import { State, StateMachine, Account, SoftTransfer, toHex } from '../../../app';
import { randomAccount } from '../../utils';

const test = () =>describe("Soft Transfer", () => {
  let state,
    sender,
    initialSender,
    receiver,
    initialReceiver,
    initialStateSize,
    transferAmount;

  before(async () => {
    // SET UP INITIAL STATE
    state = await State.create();
    const stateMachine = new StateMachine(state);

    const receiverContract = randomAccount();
    const receiverSigner = randomAccount();
    const receiverInitialBalance = 100;
    initialReceiver = new Account({
      address: receiverContract.address,
      nonce: 0,
      balance: receiverInitialBalance,
      signers: [receiverSigner.address]
    });
    const receiverAccountIndex = await state.putAccount(initialReceiver);

    const senderContract = randomAccount();
    const senderSigner = randomAccount();
    const senderInitialBalance = 50;
    initialSender = new Account({
      address: senderContract.address,
      nonce: 0,
      balance: senderInitialBalance,
      signers: [senderSigner.address]
    });

    const senderAccountIndex = await state.putAccount(initialSender);
    initialStateSize = state.size;

    // EXECUTE TRANSACTION
    transferAmount = 20;

    const softTransfer = new SoftTransfer({
      fromAccountIndex: senderAccountIndex,
      toAccountIndex: receiverAccountIndex,
      nonce: initialSender.nonce,
      value: transferAmount,
      privateKey: senderSigner.privateKey
    });

    softTransfer.assignResolvers(() => {}, () => {});

    await stateMachine.softTransfer(softTransfer);

    sender = await state.getAccount(senderAccountIndex);
    receiver = await state.getAccount(receiverAccountIndex);
  });

  it("Should not have moved the sender or receiver accounts from their initial index", async () => {
    expect(sender.address).to.eql(initialSender.address);
    expect(receiver.address).to.eql(initialReceiver.address);
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

  it("Should not have changed the receivers's account nonce", async () => {
    expect(receiver.nonce).to.eql(initialReceiver.nonce);
  });

  it("Should have credited the transfer amount to the receiver's balance", async () =>
    expect(receiver.balance).to.eql(initialReceiver.balance + transferAmount));

  it("Should not have modified the receivers's signers", async () => {
    expect(receiver.signers.length).to.eql(initialReceiver.signers.length);
    for (let signer of initialReceiver.signers) {
      expect(receiver.hasSigner(toHex(signer))).to.be.true;
    }
  });

  it("Should not have updated the state size", async () => {
    expect(state.size).to.eql(initialStateSize);
  });
});

export default test;
if (process.env.NODE_ENV != "all") test();