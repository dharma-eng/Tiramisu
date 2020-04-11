const { expect } = require('chai');
const { privateToAddress } = require('ethereumjs-utils')
const State = require('./State');
const StateMachine = require('./StateMachine');
const { Account, HardCreate, HardDeposit, SoftTransfer } = require('../types');
const { randomHexBuffer } = require('../../utils/test-utils/random');
const { toHex } = require('../lib/to');

const privateKey1 = randomHexBuffer(32);
const address1 = privateToAddress(privateKey1);

describe('State Machine Test', () => {
  let state, stateMachine, account, accountIndex;

  before(async () => {
    state = await State.create();
    stateMachine = new StateMachine(state);
    account = new Account({
      address: '0x' + 'aabb'.repeat(10),
      nonce: 0,
      balance: 50,
      signers: ['0x' + 'aabb'.repeat(10)]
    });
    accountIndex = await state.putAccount(account);
  })

  describe('Hard Deposit', () => {
    const hardDeposit = new HardDeposit({
      accountIndex: 0,
      hardTransactionIndex: 0,
      value: 500
    });

    it('Should execute a hard deposit', async () => {
      await stateMachine.hardDeposit(hardDeposit);
    });

    it('Should have updated the account balance', async () => {
      account = await state.getAccount(accountIndex);
      expect(account.balance).to.eql(550);
    });

    it('Should not have updated the account nonce', async () => {
      account = await state.getAccount(accountIndex);
    });
  })

  describe('Hard Create', () => {
    let newAccount;
    const hardCreate = new HardCreate({
      hardTransactionIndex: 0,
      contractAddress: address1,
      signerAddress: address1,
      value: 100
    });

    it('Should execute a hard create', async () => {
      await stateMachine.hardCreate(hardCreate);
    });

    it('Should have created a new account with value as its balance, a nonce of zero and the corrent signer array', async () => {
      newAccount = await state.getAccount(1)
      expect(newAccount.balance).to.eql(100);
      expect(newAccount.nonce).to.eql(0);
      expect(newAccount.hasSigner(toHex(address1))).to.be.true;
      expect(newAccount.signers.length).to.eql(1);
    });

    it('Should have mapped the contract address to the account index', async () => {
      expect(await state.getAccountIndexByAddress(newAccount.address)).to.eql(1);
    });

    it('Should have updated the state size', async () => {
      expect(state.size).to.eql(2)
    });
  })

  describe('Soft Transfer', async () => {
    let newAccount;
    const softTransfer = new SoftTransfer({
      fromAccountIndex: 1,
      toAccountIndex: 0,
      nonce: 0,
      value: 20,
      privateKey: privateKey1
    });
    
    softTransfer.assignResolvers(() => {}, () => {})
    
    it('Should execute a signed transfer', async () => {
      const res = await stateMachine.softTransfer(softTransfer);
      expect(res).to.be.true;
    });

    it('Should have updated the account nonce', async () => {
      newAccount = await state.getAccount(1);
      expect(newAccount.nonce).to.eql(1);
    });

    it(`Should have updated the sender's balance`, () => expect(newAccount.balance).to.eql(80));

    it(`Should have updated the recipient's balance`, async () => {
      const account = await state.getAccount(0);
      expect(account.balance).to.eql(570);
    })
  })
})