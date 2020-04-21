const { expect } = require("chai");
const State = require("../../../app/state/State");
const StateMachine = require("../../../app/state/StateMachine");
const { toHex } = require("../../../app/lib/to");
const { Account, SoftChangeSigner } = require("../../../app/types");
const { randomAccount } = require("../../utils/random");

describe("Soft Change Signer", () => {
  let state,
    stateMachine,
    accountIndex,
    account,
    initialAccount,
    initialStateSize,
    signer,
    contract,
    newSigner;

  before(async () => {
    // SET UP INITIAL STATE
    state = await State.create();
    stateMachine = new StateMachine(state);

    contract = randomAccount();
    signer = randomAccount();
    const initialAccountBalance = 100;
    initialAccount = new Account({
      address: contract.address,
      nonce: 0,
      balance: initialAccountBalance,
      signers: [signer.address]
    });
    accountIndex = await state.putAccount(initialAccount);

    initialStateSize = state.size;
  });

  describe("Add Signer Address", async () => {
    before(async () => {
      // EXECUTE TRANSACTION
      newSigner = randomAccount();

      const softChangeSigner = new SoftChangeSigner({
        fromAccountIndex: accountIndex,
        nonce: initialAccount.nonce,
        signingAddress: newSigner.address,
        modificationCategory: 0,
        privateKey: signer.privateKey
      });

      softChangeSigner.assignResolvers(
        () => {},
        err => {
          console.log(`ERR-ERR  ${err}  ERR-ERR`);
        }
      );

      await stateMachine.softChangeSigner(softChangeSigner);

      account = await state.getAccount(accountIndex);
    });

    it("Should have kept the account at the same index", async () => {
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should have incremented the account nonce", async () => {
      expect(account.nonce).to.eql(initialAccount.nonce + 1);
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

    it("Should not have updated the state size", async () => {
      expect(state.size).to.eql(initialStateSize);
    });
  });

  describe("Remove Signer Address", async () => {
    before(async () => {
      // EXECUTE TRANSACTION
      initialAccount = account;

      const softChangeSigner = new SoftChangeSigner({
        fromAccountIndex: accountIndex,
        nonce: initialAccount.nonce,
        signingAddress: newSigner.address,
        modificationCategory: 1,
        privateKey: signer.privateKey
      });

      softChangeSigner.assignResolvers(
        () => {},
        err => {
          console.log(`ERR-ERR  ${err}  ERR-ERR`);
        }
      );

      await stateMachine.softChangeSigner(softChangeSigner);

      account = await state.getAccount(accountIndex);
    });

    it("Should have kept the account at the same index", async () => {
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should have incremented the account nonce", async () => {
      expect(account.nonce).to.eql(initialAccount.nonce + 1);
    });

    it("Should have removed one signer", async () => {
      expect(account.signers.length).to.eql(initialAccount.signers.length - 1);
    });

    it("Should have removed the expected signer", async () => {
      expect(account.hasSigner(toHex(newSigner.address))).to.be.false;
    });

    it("Should have all of the other signers that the initial account had", async () => {
      for (let signer of initialAccount.signers) {
        if (signer !== newSigner.address) {
          expect(account.hasSigner(toHex(signer))).to.be.true;
        }
      }
    });

    it("Should not have modified the account balance", async () => {
      expect(account.balance).to.eql(initialAccount.balance);
    });

    it("Should not have updated the state size", async () => {
      expect(state.size).to.eql(initialStateSize);
    });
  });
});
