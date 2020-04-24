import { expect } from 'chai';
import { State, StateMachine, Account, SoftTransfer, toHex } from '../../../app';
import { randomAccount } from '../../utils';

const test = () => describe("Soft Transfer", () => {
  let state,
    sender,
    stateMachine,
    senderAccountIndex,
    senderSigner,
    initialSender,
    receiver,
    receiverAccountIndex,
    initialReceiver,
    initialStateSize,
    transactions;

  before(async () => {
    // SET UP INITIAL STATE
    state = await State.create();
    stateMachine = new StateMachine(state);

    const receiverContract = randomAccount();
    const receiverSigner = randomAccount();
    const receiverInitialBalance = 100;
    initialReceiver = new Account({
      address: receiverContract.address,
      nonce: 0,
      balance: receiverInitialBalance,
      signers: [receiverSigner.address]
    });
    receiverAccountIndex = await state.putAccount(initialReceiver);

    const senderContract = randomAccount();
    senderSigner = randomAccount();
    const senderInitialBalance = 50;
    initialSender = new Account({
      address: senderContract.address,
      nonce: 0,
      balance: senderInitialBalance,
      signers: [senderSigner.address]
    });

    senderAccountIndex = await state.putAccount(initialSender);
    initialStateSize = state.size;
  });

  describe("Valid Soft Transfer", () => {
    let transferAmount, softTransfer;
    before(async () => {
      initialStateSize = state.size;
      initialSender = await state.getAccount(senderAccountIndex);
      initialReceiver = await state.getAccount(receiverAccountIndex);

      // EXECUTE TRANSACTION
      transferAmount = initialSender.balance / 5;
      softTransfer = new SoftTransfer({
        fromAccountIndex: senderAccountIndex,
        toAccountIndex: receiverAccountIndex,
        nonce: initialSender.nonce,
        value: transferAmount,
        privateKey: senderSigner.privateKey
      });

      softTransfer.assignResolvers(() => {}, () => {});

      transactions = {
        softTransfers: [softTransfer]
      };
    });

    it("Should execute the soft transfer", async () => {
      await stateMachine.execute(transactions);
    });

    it("Should not have moved the sender or receiver accounts from their initial index", async () => {
      sender = await state.getAccount(senderAccountIndex);
      expect(sender.address).to.eql(initialSender.address);

      receiver = await state.getAccount(receiverAccountIndex);
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

    it("Should encode the transaction to the correct number of byes", async () => {
      let encoded = softTransfer.encode(true);
      expect(encoded.length).to.eql(softTransfer.bytesWithoutPrefix + 1);

      encoded = softTransfer.encode(false);
      expect(encoded.length).to.eql(softTransfer.bytesWithoutPrefix);
    });
  });

  describe("Invalid Signature", () => {
    let transferAmount, softTransfer;
    before(async () => {
      initialStateSize = state.size;
      initialSender = await state.getAccount(senderAccountIndex);
      initialReceiver = await state.getAccount(receiverAccountIndex);

      // EXECUTE TRANSACTION
      transferAmount = initialSender.balance / 5;
      const badSenderSigner = randomAccount();
      softTransfer = new SoftTransfer({
        fromAccountIndex: senderAccountIndex,
        toAccountIndex: receiverAccountIndex,
        nonce: initialSender.nonce,
        value: transferAmount,
        privateKey: badSenderSigner.privateKey
      });

      softTransfer.assignResolvers(() => {}, () => {});

      transactions = {
        softTransfers: [softTransfer]
      };
    });

    it("Should not execute the soft transfer", async () => {
      await stateMachine.execute(transactions);

      const valid = softTransfer.checkValid(initialSender);
      expect(valid).to.eql("Invalid signature.");
    });

    it("Should not have moved the sender or receiver accounts from their initial index", async () => {
      sender = await state.getAccount(senderAccountIndex);
      expect(sender.address).to.eql(initialSender.address);

      receiver = await state.getAccount(receiverAccountIndex);
      expect(receiver.address).to.eql(initialReceiver.address);
    });

    it("Should not have incremented the sender's account nonce", async () => {
      expect(sender.nonce).to.eql(initialSender.nonce);
    });

    it("Should not have changed the sender's balance", async () =>
      expect(sender.balance).to.eql(initialSender.balance));

    it("Should not have modified the sender's signers", async () => {
      expect(sender.signers.length).to.eql(initialSender.signers.length);
      for (let signer of initialSender.signers) {
        expect(sender.hasSigner(toHex(signer))).to.be.true;
      }
    });

    it("Should not have changed the receivers's account nonce", async () => {
      expect(receiver.nonce).to.eql(initialReceiver.nonce);
    });

    it("Should not have changed the receiver's balance", async () =>
      expect(receiver.balance).to.eql(initialReceiver.balance));

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

  describe("Invalid Nonce", () => {
    let transferAmount, softTransfer;
    before(async () => {
      initialStateSize = state.size;
      initialSender = await state.getAccount(senderAccountIndex);
      initialReceiver = await state.getAccount(receiverAccountIndex);

      // EXECUTE TRANSACTION
      transferAmount = initialSender.balance / 5;
      softTransfer = new SoftTransfer({
        fromAccountIndex: senderAccountIndex,
        toAccountIndex: receiverAccountIndex,
        nonce: initialSender.nonce + 1,
        value: transferAmount,
        privateKey: senderSigner.privateKey
      });

      softTransfer.assignResolvers(() => {}, () => {});

      transactions = {
        softTransfers: [softTransfer]
      };
    });

    it("Should not execute the soft transfer", async () => {
      await stateMachine.execute(transactions);

      const valid = softTransfer.checkValid(initialSender);
      expect(valid).to.eql(`Invalid nonce. Expected ${initialSender.nonce}`);
    });

    it("Should not have moved the sender or receiver accounts from their initial index", async () => {
      sender = await state.getAccount(senderAccountIndex);
      expect(sender.address).to.eql(initialSender.address);

      receiver = await state.getAccount(receiverAccountIndex);
      expect(receiver.address).to.eql(initialReceiver.address);
    });

    it("Should not have incremented the sender's account nonce", async () => {
      expect(sender.nonce).to.eql(initialSender.nonce);
    });

    it("Should not have changed the sender's balance", async () =>
      expect(sender.balance).to.eql(initialSender.balance));

    it("Should not have modified the sender's signers", async () => {
      expect(sender.signers.length).to.eql(initialSender.signers.length);
      for (let signer of initialSender.signers) {
        expect(sender.hasSigner(toHex(signer))).to.be.true;
      }
    });

    it("Should not have changed the receivers's account nonce", async () => {
      expect(receiver.nonce).to.eql(initialReceiver.nonce);
    });

    it("Should not have changed the receiver's balance", async () =>
      expect(receiver.balance).to.eql(initialReceiver.balance));

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

  describe("Sending more than sender's balance", () => {
    let transferAmount, softTransfer;
    before(async () => {
      initialStateSize = state.size;
      initialSender = await state.getAccount(senderAccountIndex);
      initialReceiver = await state.getAccount(receiverAccountIndex);

      // EXECUTE TRANSACTION
      transferAmount = initialSender.balance + 5;
      softTransfer = new SoftTransfer({
        fromAccountIndex: senderAccountIndex,
        toAccountIndex: receiverAccountIndex,
        nonce: initialSender.nonce,
        value: transferAmount,
        privateKey: senderSigner.privateKey
      });

      softTransfer.assignResolvers(() => {}, () => {});

      transactions = {
        softTransfers: [softTransfer]
      };
    });

    it("Should not execute the soft transfer", async () => {
      await stateMachine.execute(transactions);

      const valid = softTransfer.checkValid(initialSender);
      expect(valid).to.eql(`Insufficient balance. Account has ${initialSender.balance}.`);
    });

    it("Should not have moved the sender or receiver accounts from their initial index", async () => {
      sender = await state.getAccount(senderAccountIndex);
      expect(sender.address).to.eql(initialSender.address);

      receiver = await state.getAccount(receiverAccountIndex);
      expect(receiver.address).to.eql(initialReceiver.address);
    });

    it("Should not have incremented the sender's account nonce", async () => {
      expect(sender.nonce).to.eql(initialSender.nonce);
    });

    it("Should not have changed the sender's balance", async () =>
      expect(sender.balance).to.eql(initialSender.balance));

    it("Should not have modified the sender's signers", async () => {
      expect(sender.signers.length).to.eql(initialSender.signers.length);
      for (let signer of initialSender.signers) {
        expect(sender.hasSigner(toHex(signer))).to.be.true;
      }
    });

    it("Should not have changed the receivers's account nonce", async () => {
      expect(receiver.nonce).to.eql(initialReceiver.nonce);
    });

    it("Should not have changed the receiver's balance", async () =>
      expect(receiver.balance).to.eql(initialReceiver.balance));

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
});

export default test;
if (process.env.NODE_ENV != "all") test();
