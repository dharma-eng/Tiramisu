import { expect } from 'chai';
import { State, StateMachine, Account, SoftCreate, toHex } from '../../../app';
import { randomAccount } from '../../utils';

const test = () => describe("Soft Create", () => {
  let state,
    stateMachine,
    account,
    initialAccount,
    sender,
    senderAccountIndex,
    senderSigner,
    initialSender,
    initialStateSize,
    transferAmount,
    transactions;

  before(async () => {
    // SET UP INITIAL STATE
    state = await State.create();
    stateMachine = new StateMachine(state);

    const senderContract = randomAccount();
    senderSigner = randomAccount();
    const senderInitialBalance = 150;
    initialSender = new Account({
      address: senderContract.address,
      nonce: 0,
      balance: senderInitialBalance,
      signers: [senderSigner.address]
    });
    senderAccountIndex = await state.putAccount(initialSender);

    initialStateSize = state.size;
  });

  describe("Simple Soft Create", () => {
    let signer, softCreate;
    before(async () => {
      initialSender = await state.getAccount(senderAccountIndex);
      initialStateSize = state.size;
      // EXECUTE TRANSACTION
      const contract = randomAccount();
      signer = randomAccount();
      transferAmount = initialSender.balance / 5;
      const initialAccountBalance = transferAmount;
      initialAccount = new Account({
        address: contract.address,
        nonce: 0,
        balance: initialAccountBalance,
        signers: [signer.address]
      });

      softCreate = new SoftCreate({
        fromAccountIndex: senderAccountIndex,
        nonce: initialSender.nonce,
        privateKey: senderSigner.privateKey,
        toAccountIndex: initialStateSize,
        value: initialAccount.balance,
        contractAddress: initialAccount.address,
        signingAddress: signer.address
      });

      softCreate.assignResolvers(() => {}, () => {});

      transactions = {
        softCreates: [softCreate]
      }
    });

    it("Should execute the transaction", async () => {
      await stateMachine.execute(transactions);
    });

    it("Should create an account with the expected address", async () => {
      account = await state.getAccount(initialStateSize);
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should create an account with the expected address", async () => {
      sender = await state.getAccount(senderAccountIndex);
      expect(sender.address).to.eql(initialSender.address);
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

    it("Should encode the transaction to the correct number of byes", async () => {
      let encoded = softCreate.encode(true);
      expect(encoded.length).to.eql(softCreate.bytesWithoutPrefix + 1);

      encoded = softCreate.encode(false);
      expect(encoded.length).to.eql(softCreate.bytesWithoutPrefix);
    });
  });

  describe("Soft create with invalid signer", () => {
    let signer, softCreate;
    before(async () => {
      initialSender = await state.getAccount(senderAccountIndex);
      initialStateSize = state.size;
      // EXECUTE TRANSACTION
      const contract = randomAccount();
      signer = randomAccount();
      transferAmount = initialSender.balance / 5;
      const initialAccountBalance = transferAmount;
      initialAccount = new Account({
        address: contract.address,
        nonce: 0,
        balance: initialAccountBalance,
        signers: [signer.address]
      });

      const badSenderSigner = randomAccount();

      softCreate = new SoftCreate({
        fromAccountIndex: senderAccountIndex,
        nonce: initialSender.nonce,
        privateKey: badSenderSigner.privateKey,
        toAccountIndex: initialStateSize,
        value: initialAccount.balance,
        contractAddress: initialAccount.address,
        signingAddress: signer.address
      });

      softCreate.assignResolvers(() => {}, () => {});

      transactions = {
        softCreates: [softCreate]
      }
    });

    it("Should not execute the transaction", async () => {
      await stateMachine.execute(transactions);

      sender = await state.getAccount(senderAccountIndex);

      const valid = softCreate.checkValid(sender);
      expect(valid).to.eql("Invalid signature.");
    });

    it("Should not create an account", async () => {
      account = await state.getAccount(initialStateSize);
      expect(account).to.eql(null);
    });

    it("Should not have updated the state size", async () => {
      expect(state.size).to.eql(initialStateSize);
    });

    it("Should not have incremented the sender's account nonce", async () => {
      expect(sender.nonce).to.eql(initialSender.nonce);
    });

    it("Should not have debited the transfer amount from the sender's balance", async () =>
      expect(sender.balance).to.eql(initialSender.balance));

    it("Should not have modified the sender's signers", async () => {
      expect(sender.signers.length).to.eql(initialSender.signers.length);
      for (let signer of initialSender.signers) {
        expect(sender.hasSigner(toHex(signer))).to.be.true;
      }
    });
  });

  describe("Soft create with invalid nonce", () => {
    let signer, softCreate;
    before(async () => {
      initialSender = await state.getAccount(senderAccountIndex);
      initialStateSize = state.size;
      // EXECUTE TRANSACTION
      const contract = randomAccount();
      signer = randomAccount();
      transferAmount = initialSender.balance / 5;
      const initialAccountBalance = transferAmount;
      initialAccount = new Account({
        address: contract.address,
        nonce: 0,
        balance: initialAccountBalance,
        signers: [signer.address]
      });

      softCreate = new SoftCreate({
        fromAccountIndex: senderAccountIndex,
        nonce: initialSender.nonce + 1,
        privateKey: senderSigner.privateKey,
        toAccountIndex: initialStateSize,
        value: initialAccount.balance,
        contractAddress: initialAccount.address,
        signingAddress: signer.address
      });

      softCreate.assignResolvers(() => {}, () => {});

      transactions = {
        softCreates: [softCreate]
      }
    });

    it("Should not execute the transaction", async () => {
      await stateMachine.execute(transactions);

      sender = await state.getAccount(senderAccountIndex);

      const valid = softCreate.checkValid(sender);
      expect(valid).to.eql(`Invalid nonce. Expected ${initialSender.nonce}`);
    });

    it("Should not create an account", async () => {
      account = await state.getAccount(initialStateSize);
      expect(account).to.eql(null);
    });

    it("Should not have updated the state size", async () => {
      expect(state.size).to.eql(initialStateSize);
    });

    it("Should not have incremented the sender's account nonce", async () => {
      expect(sender.nonce).to.eql(initialSender.nonce);
    });

    it("Should not have debited the transfer amount from the sender's balance", async () =>
      expect(sender.balance).to.eql(initialSender.balance));

    it("Should not have modified the sender's signers", async () => {
      expect(sender.signers.length).to.eql(initialSender.signers.length);
      for (let signer of initialSender.signers) {
        expect(sender.hasSigner(toHex(signer))).to.be.true;
      }
    });
  });

  describe("Soft create transferring more than sender balance", () => {
    let signer, softCreate;
    before(async () => {
      initialSender = await state.getAccount(senderAccountIndex);
      initialStateSize = state.size;
      // EXECUTE TRANSACTION
      const contract = randomAccount();
      signer = randomAccount();
      transferAmount = initialSender.balance + 5;
      const initialAccountBalance = transferAmount;
      initialAccount = new Account({
        address: contract.address,
        nonce: 0,
        balance: initialAccountBalance,
        signers: [signer.address]
      });

      softCreate = new SoftCreate({
        fromAccountIndex: senderAccountIndex,
        nonce: initialSender.nonce,
        privateKey: senderSigner.privateKey,
        toAccountIndex: initialStateSize,
        value: initialAccount.balance,
        contractAddress: initialAccount.address,
        signingAddress: signer.address
      });

      softCreate.assignResolvers(() => {}, () => {});

      transactions = {
        softCreates: [softCreate]
      }
    });

    it("Should not execute the transaction", async () => {
      await stateMachine.execute(transactions);

      sender = await state.getAccount(senderAccountIndex);

      const valid = softCreate.checkValid(sender);
      expect(valid).to.eql(`Insufficient balance. Account has ${initialSender.balance}.`);
    });

    it("Should not create an account", async () => {
      account = await state.getAccount(initialStateSize);
      expect(account).to.eql(null);
    });

    it("Should not have updated the state size", async () => {
      expect(state.size).to.eql(initialStateSize);
    });

    it("Should not have incremented the sender's account nonce", async () => {
      expect(sender.nonce).to.eql(initialSender.nonce);
    });

    it("Should not have debited the transfer amount from the sender's balance", async () =>
      expect(sender.balance).to.eql(initialSender.balance));

    it("Should not have modified the sender's signers", async () => {
      expect(sender.signers.length).to.eql(initialSender.signers.length);
      for (let signer of initialSender.signers) {
        expect(sender.hasSigner(toHex(signer))).to.be.true;
      }
    });
  });
});

export default test;
if (process.env.NODE_ENV != 'all' && process.env.NODE_ENV != 'coverage') test();
