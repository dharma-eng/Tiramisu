const { expect } = require("chai");
const { privateToAddress } = require("ethereumjs-utils");
const State = require("../../app/state/State");
const StateMachine = require("../../app/state/StateMachine");
const {
  Account,
  HardCreate,
  HardDeposit,
  HardWithdraw,
  HardAddSigner,
  SoftTransfer,
  SoftChangeSigner
} = require("../../app/types");
const { randomHexBuffer } = require("../../test/utils/random");
const { toHex } = require("../../app/lib/to");

const accountAddress = "0x" + "aabb".repeat(10);
const initialSigner = "0x" + "ccdd".repeat(10);

const randomAccount = () => {
  let privateKey = randomHexBuffer(32);
  let address = privateToAddress(privateKey);
  return { privateKey, address };
};

const { privateKey: privateKey1, address: address1 } = randomAccount();

describe("State Machine Test", () => {
  let state, stateMachine, account, accountIndex;

  before(async () => {
    state = await State.create();
    stateMachine = new StateMachine(state);
    account = new Account({
      address: accountAddress,
      nonce: 0,
      balance: 50,
      signers: [initialSigner]
    });
    accountIndex = await state.putAccount(account);
  });

  describe("Hard Deposit", () => {
    const hardDeposit = new HardDeposit({
      accountIndex: 0,
      hardTransactionIndex: 0,
      value: 500
    });

    it("Should execute a hard deposit", async () => {
      await stateMachine.hardDeposit(hardDeposit);
    });

    it("Should have updated the account balance", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.balance).to.eql(550);
    });

    it("Should not have updated the account nonce", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.nonce).to.eql(0);
    });
  });

  describe("Hard Create", () => {
    let newAccount;
    const hardCreate = new HardCreate({
      hardTransactionIndex: 0,
      contractAddress: address1,
      signerAddress: address1,
      value: 100
    });

    it("Should execute a hard create", async () => {
      await stateMachine.hardCreate(hardCreate);
    });

    it("Should have created a new account with value as its balance, a nonce of zero and the corrent signer array", async () => {
      newAccount = await state.getAccount(1);
      expect(newAccount.balance).to.eql(100);
      expect(newAccount.nonce).to.eql(0);
      expect(newAccount.hasSigner(toHex(address1))).to.be.true;
      expect(newAccount.signers.length).to.eql(1);
    });

    it("Should have mapped the contract address to the account index", async () => {
      expect(await state.getAccountIndexByAddress(newAccount.address)).to.eql(
        1
      );
    });

    it("Should have updated the state size", async () => {
      expect(state.size).to.eql(2);
    });
  });

  describe("Hard Withdraw", () => {
    const hardWithdrawal = new HardWithdraw({
      accountIndex: 0,
      hardTransactionIndex: 0,
      callerAddress: accountAddress,
      value: 500
    });

    it("Should execute a hard withdraw transaction", async () => {
      await stateMachine.hardWithdraw(hardWithdrawal);
    });

    it("Should have updated the account balance", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.balance).to.eql(50);
    });

    it("Should not have updated the account nonce", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.nonce).to.eql(0);
    });
  });

  describe("Hard Add Signer", () => {
    const { address: newAddress } = randomAccount();
    const hardAddSigner = new HardAddSigner({
      accountIndex: 0,
      hardTransactionIndex: 0,
      callerAddress: accountAddress,
      signingAddress: newAddress
    });

    it("Should execute a hard add signer transaction", async () => {
      await stateMachine.hardAddSigner(hardAddSigner);
    });

    it("Should have updated the signer array", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.signers.length).to.eql(2);
      expect(account.hasSigner(newAddress)).to.be.true;
    });

    it("Should not have updated the account nonce", async () => {
      account = await state.getAccount(accountIndex);
    });
  });

  describe("Soft Transfer", async () => {
    let newAccount;
    const softTransfer = new SoftTransfer({
      fromAccountIndex: 1,
      toAccountIndex: 0,
      nonce: 0,
      value: 20,
      privateKey: privateKey1
    });

    softTransfer.assignResolvers(() => {}, () => {});

    it("Should execute a signed transfer", async () => {
      const res = await stateMachine.softTransfer(softTransfer);
      expect(res).to.be.true;
    });

    it("Should have updated the account nonce", async () => {
      newAccount = await state.getAccount(1);
      expect(newAccount.nonce).to.eql(1);
    });

    it(`Should have updated the sender's balance`, () =>
      expect(newAccount.balance).to.eql(80));

    it(`Should have updated the recipient's balance`, async () => {
      const account = await state.getAccount(0);
      expect(account.balance).to.eql(70);
    });
  });

  describe("Soft Change Signer", async () => {
    let newAccount;
    const { address: newAddress } = randomAccount();

    describe("Add Signer Address", async () => {
      const softChangeSigner = new SoftChangeSigner({
        fromAccountIndex: 1,
        nonce: 1,
        signingAddress: newAddress,
        modificationCategory: 0,
        privateKey: privateKey1
      });

      softChangeSigner.assignResolvers(
        () => {},
        err => {
          console.log(`ERR-ERR  ${err}  ERR-ERR`);
        }
      );

      it("Should execute a signed change signer transaction", async () => {
        const res = await stateMachine.softChangeSigner(softChangeSigner);
        expect(res).to.be.true;
      });

      it("Should have updated the account nonce", async () => {
        newAccount = await state.getAccount(1);
        expect(newAccount.nonce).to.eql(2);
      });

      it(`Should have added the signer address`, () => {
        expect(newAccount.signers.length).to.eql(2);
        expect(newAccount.hasSigner(newAddress)).to.be.true;
      });
    });

    describe("Remove Signer Address", async () => {
      const softChangeSigner = new SoftChangeSigner({
        fromAccountIndex: 1,
        nonce: 2,
        signingAddress: newAddress,
        modificationCategory: 1,
        privateKey: privateKey1
      });

      softChangeSigner.assignResolvers(
        () => {},
        err => {
          console.log(`ERR-ERR  ${err}  ERR-ERR`);
        }
      );

      it("Should execute a signed change signer transaction", async () => {
        const res = await stateMachine.softChangeSigner(softChangeSigner);
        expect(res).to.be.true;
      });

      it("Should have updated the account nonce", async () => {
        newAccount = await state.getAccount(1);
        expect(newAccount.nonce).to.eql(3);
      });

      it(`Should have removed the signer address`, () => {
        expect(newAccount.signers.length).to.eql(1);
        expect(newAccount.hasSigner(newAddress)).to.be.false;
      });
    });
  });
});
