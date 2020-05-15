import { expect } from 'chai';
import { State, StateMachine, Account, SoftChangeSigner, toHex } from '../../../app';
import { randomAccount } from '../../utils';

const test = () => describe("Soft Change Signer", () => {
  let state,
    stateMachine,
    accountIndex,
    account,
    initialAccount,
    initialStateSize,
    signer,
    transactions;

  before(async () => {
    // SET UP INITIAL STATE
    state = await State.create();
    stateMachine = new StateMachine(state);

    const contract = randomAccount();
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
    let softChangeSigner, newSigner;
    before(async () => {
      initialAccount = await state.getAccount(accountIndex);
      // EXECUTE TRANSACTION
      newSigner = randomAccount();

      softChangeSigner = new SoftChangeSigner({
        accountIndex,
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

      transactions = {
        softChangeSigners: [softChangeSigner]
      };
    });

    it("Should add the signer", async () => {
      await stateMachine.execute(transactions);
    });

    it("Should have kept the account at the same index", async () => {
      account = await state.getAccount(accountIndex);
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

    it("Should be able to encode the transaction", async () => {
      let encoded = softChangeSigner.encode(true);
      expect(encoded.length).to.eql(softChangeSigner.bytesWithoutPrefix + 1);

      encoded = softChangeSigner.encode(false);
      expect(encoded.length).to.eql(softChangeSigner.bytesWithoutPrefix);
    });
  });

  describe("Add signer with bad signature", async () => {
    let softChangeSigner, newSigner;
    before(async () => {
      initialAccount = await state.getAccount(accountIndex);
      // EXECUTE TRANSACTION
      newSigner = randomAccount();

      softChangeSigner = new SoftChangeSigner({
        accountIndex,
        nonce: initialAccount.nonce,
        signingAddress: newSigner.address,
        modificationCategory: 0,
        privateKey: newSigner.privateKey
      });

      softChangeSigner.assignResolvers(
        () => {},
        err => {
          console.log(`ERR-ERR  ${err}  ERR-ERR`);
        }
      );

      transactions = {
        softChangeSigners: [softChangeSigner]
      };
    });

    it("Should not add the signer", async () => {
      await stateMachine.execute(transactions);

      const valid = softChangeSigner.checkValid(initialAccount);
      expect(valid).to.eql("Invalid signature.");
    });

    it("Should have kept the account at the same index", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should not have incremented the account nonce", async () => {
      expect(account.nonce).to.eql(initialAccount.nonce);
    });

    it("Should not have changed the number of signers", async () => {
      expect(account.signers.length).to.eql(initialAccount.signers.length);
    });

    it("Should not have added the attempted signer", async () => {
      expect(account.hasSigner(toHex(newSigner.address))).to.be.false;
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

  describe("Add signer with bad nonce", async () => {
    let softChangeSigner, newSigner;
    before(async () => {
      initialAccount = await state.getAccount(accountIndex);
      // EXECUTE TRANSACTION
      newSigner = randomAccount();

      softChangeSigner = new SoftChangeSigner({
        accountIndex,
        nonce: initialAccount.nonce - 1,
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

      transactions = {
        softChangeSigners: [softChangeSigner]
      };
    });

    it("Should not add the signer", async () => {
      await stateMachine.execute(transactions);

      const valid = softChangeSigner.checkValid(initialAccount);
      expect(valid).to.eql(`Invalid nonce. Expected ${initialAccount.nonce}`);
    });

    it("Should have kept the account at the same index", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should not have incremented the account nonce", async () => {
      expect(account.nonce).to.eql(initialAccount.nonce);
    });

    it("Should not have changed the number of signers", async () => {
      expect(account.signers.length).to.eql(initialAccount.signers.length);
    });

    it("Should not have added the attempted signer", async () => {
      expect(account.hasSigner(toHex(newSigner.address))).to.be.false;
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

  describe("Double-add signer", async () => {
    let softChangeSigner, newSigner;
    before(async () => {
      initialAccount = await state.getAccount(accountIndex);
      // EXECUTE TRANSACTION
      newSigner = randomAccount();

      softChangeSigner = new SoftChangeSigner({
        accountIndex,
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

      transactions = {
        softChangeSigners: [softChangeSigner]
      };
    });

    it("Should add the signer once", async () => {
      await stateMachine.execute(transactions);

      account = await state.getAccount(accountIndex);
    });

    it("Should not add the signer a second time", async () => {
      softChangeSigner = new SoftChangeSigner({
        accountIndex,
        nonce: account.nonce,
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

      transactions = {
        softChangeSigners: [softChangeSigner]
      };

      await stateMachine.execute(transactions);

      const valid = softChangeSigner.checkValid(account);
      expect(valid).to.eql(`Invalid signing address. Account already has signer ${newSigner.address}`);
    });

    it("Should have kept the account at the same index", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should have incremented the account nonce once", async () => {
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

  describe("Add more than 10 signers", async () => {
    let softChangeSigner, newSigner;
    before(async () => {
      initialAccount = await state.getAccount(accountIndex);
    });

    it("Should add up to 10 signers", async () => {
      let numSigners = initialAccount.signers.length;

      while (numSigners < 10) {
        initialAccount = await state.getAccount(accountIndex);

        newSigner = randomAccount();

        softChangeSigner = new SoftChangeSigner({
          accountIndex,
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

        transactions = {
          softChangeSigners: [softChangeSigner]
        };

        await stateMachine.execute(transactions);

        account = await state.getAccount(accountIndex);
        expect(account.hasSigner(toHex(newSigner.address))).to.be.true;
        expect(account.signers.length).to.eql(initialAccount.signers.length + 1);

        numSigners = account.signers.length;
      }
    });

    it("Should not add a 10th signer", async () => {
      initialAccount = await state.getAccount(accountIndex);

      newSigner = randomAccount();

      softChangeSigner = new SoftChangeSigner({
        accountIndex,
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

      transactions = {
        softChangeSigners: [softChangeSigner]
      };

      await stateMachine.execute(transactions);

      account = await state.getAccount(accountIndex);
      const valid = softChangeSigner.checkValid(account);
      expect(valid).to.eql("Account signer array full.");
      expect(account.hasSigner(toHex(newSigner.address))).to.be.false;
      expect(account.signers.length).to.eql(initialAccount.signers.length);
    });
  });

  describe("Remove Signer Address", async () => {
    let newSignerAddress;

    before(async () => {
      initialAccount = await state.getAccount(accountIndex);
      // EXECUTE TRANSACTION
      newSignerAddress = initialAccount.signers[initialAccount.signers.length - 1];

      const softChangeSigner = new SoftChangeSigner({
        accountIndex,
        nonce: initialAccount.nonce,
        signingAddress: newSignerAddress,
        modificationCategory: 1,
        privateKey: signer.privateKey
      });

      softChangeSigner.assignResolvers(
        () => {},
        err => {
          console.log(`ERR-ERR  ${err}  ERR-ERR`);
        }
      );

      transactions = {
        softChangeSigners: [softChangeSigner]
      };

      await stateMachine.execute(transactions);

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
      expect(account.hasSigner(toHex(newSignerAddress))).to.be.false;
    });

    it("Should have all of the other signers that the initial account had", async () => {
      for (let signer of initialAccount.signers) {
        if (signer !== newSignerAddress) {
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

  describe("Remove signer that account doesn't have", async () => {
    let softChangeSigner, newSignerAddress;
    before(async () => {
      initialAccount = await state.getAccount(accountIndex);
      // EXECUTE TRANSACTION
      const newSigner = randomAccount();
      newSignerAddress = newSigner.address;

      softChangeSigner = new SoftChangeSigner({
        accountIndex,
        nonce: initialAccount.nonce,
        signingAddress: newSignerAddress,
        modificationCategory: 1,
        privateKey: signer.privateKey
      });

      softChangeSigner.assignResolvers(
        () => {},
        err => {
          console.log(`ERR-ERR  ${err}  ERR-ERR`);
        }
      );
    });

    transactions = {
      softChangeSigners: [softChangeSigner]
    };

    it("Should not remove the signer", async () => {
      await stateMachine.execute(transactions);

      const valid = softChangeSigner.checkValid(initialAccount);
      expect(valid).to.eql(`Invalid signing address. Account does not have signer ${newSignerAddress}`);
    });

    it("Should have kept the account at the same index", async () => {
      account = await state.getAccount(accountIndex);
      expect(account.address).to.eql(initialAccount.address);
    });

    it("Should not have incremented the account nonce", async () => {
      expect(account.nonce).to.eql(initialAccount.nonce);
    });

    it("Should not have changed the number of signers", async () => {
      expect(account.signers.length).to.eql(initialAccount.signers.length);
    });

    it("Should not have added the attempted signer", async () => {
      expect(account.hasSigner(toHex(newSignerAddress))).to.be.false;
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

  describe("Remove last signer", async () => {
    let softChangeSigner, removeSignerAddress;
    before(async () => {
      initialAccount = await state.getAccount(accountIndex);
    });

    it("Should remove up to the last signer", async () => {
      let numSigners = initialAccount.signers.length;

      while (numSigners > 1) {
        initialAccount = await state.getAccount(accountIndex);

        removeSignerAddress = initialAccount.signers[initialAccount.signers.length - 1];

        softChangeSigner = new SoftChangeSigner({
          accountIndex,
          nonce: initialAccount.nonce,
          signingAddress: removeSignerAddress,
          modificationCategory: 1,
          privateKey: signer.privateKey
        });

        softChangeSigner.assignResolvers(
          () => {},
          err => {
            console.log(`ERR-ERR  ${err}  ERR-ERR`);
          }
        );

        transactions = {
          softChangeSigners: [softChangeSigner]
        };

        await stateMachine.execute(transactions);

        account = await state.getAccount(accountIndex);
        expect(initialAccount.hasSigner(toHex(removeSignerAddress))).to.be.true;
        expect(account.hasSigner(toHex(removeSignerAddress))).to.be.false;
        expect(account.signers.length).to.eql(initialAccount.signers.length - 1);

        numSigners = account.signers.length;
      }
    });

    it("Should not remove the last signer", async () => {
      initialAccount = await state.getAccount(accountIndex);

      removeSignerAddress = initialAccount.signers[initialAccount.signers.length - 1];

      softChangeSigner = new SoftChangeSigner({
        accountIndex,
        nonce: initialAccount.nonce,
        signingAddress: removeSignerAddress,
        modificationCategory: 1,
        privateKey: signer.privateKey
      });

      softChangeSigner.assignResolvers(
        () => {},
        err => {
          console.log(`ERR-ERR  ${err}  ERR-ERR`);
        }
      );

      transactions = {
        softChangeSigners: [softChangeSigner]
      };

      await stateMachine.execute(transactions);

      account = await state.getAccount(accountIndex);
      const valid = softChangeSigner.checkValid(account);
      expect(valid).to.eql("Can not remove last signer from account.");
      expect(account.hasSigner(toHex(removeSignerAddress))).to.be.true;
      expect(account.signers.length).to.eql(initialAccount.signers.length);
    });
  });

  describe("Encode and decode", () => {
    let bytes: Buffer;
    it('Should encode a transaction without the prefix', () => {
      const initialAccount = randomAccount();
      const softChangeSigner = new SoftChangeSigner({
        accountIndex,
        nonce: 0,
        signingAddress: initialAccount.address,
        modificationCategory: 1,
        privateKey: initialAccount.privateKey
      });
      bytes = softChangeSigner.encode();
    });

    it('Should decode the transaction', () => {
      const softChangeSigner = SoftChangeSigner.decode(bytes);
      expect(softChangeSigner.encode().equals(bytes)).to.be.true;
    });
  });
});

export default test;
if (process.env.NODE_ENV != 'all' && process.env.NODE_ENV != 'coverage') test();
