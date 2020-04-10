const { expect } = require('chai');
const State = require('./State');
const Account = require('../types/Account');

describe('State Class Test', () => {
  let state;
  before(async () => {
    state = await State.create();
  })

  describe('Account Creation', () => {
    const account = new Account({
      address: '0x' + 'aabb'.repeat(10),
      nonce: 0,
      balance: 50,
      signers: ['0x' + 'aabb'.repeat(10)]
    });
    it('Should put an account in the state.', async () => {
      await state.putAccount(account);
    });
    it('Should update the state size', () => expect(state.size).to.eql(1));
    it('Should save an address mapping', async () => {
      const index = await state.getAccountIndexByAddress(account.address);
      expect(index).to.eql(0);
    })
    it('Should retrieve the same account', async () => {
      const retrievedAccount = await state.getAccount(0);
      expect(retrievedAccount).to.eql(account);
    });
  })
})