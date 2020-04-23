import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Tester from '../Tester';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("State Class Test", () => {
  let tester, state, account;

  before(async () => {
    ({ tester, state } = await Tester.create({ web3: false, state: true }));
    account = tester.randomAccount(50);
  });

  describe("Account Creation", async () => {
    it("Should put an account in the state.", async () => {
      await state.putAccount(account);
    });

    it("Should update the state size", () => expect(state.size).to.eql(1));

    it("Should save an address mapping", async () => {
      const index = await state.getAccountIndexByAddress(account.address);
      expect(index).to.eql(0);
    });

    it("Should retrieve an account", async () => {
      const retrievedAccount = await state.getAccount(0);
      expect(retrievedAccount.encode()).to.eql(account.encode());
    });

    it("Should fail to make an account with an existing address", async () => {
      const p = state.putAccount(account);
      expect(p).to.eventually.be.rejectedWith(
        `Account already exists for address ${account.address}`
      );
    });
  });
});
