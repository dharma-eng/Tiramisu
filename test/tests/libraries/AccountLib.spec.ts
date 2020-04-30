// const { rootHash, data, siblings, accountIndex } = require('./test-account-proof');
import chai from 'chai';
import { deploy } from '../../utils/web3';
import { compile } from '../../utils/compile';
import { Account, toHex } from '../../../app';
import { randomAccount as randomEthAccount } from '../../utils/random';
import {Tester} from '../../Tester';
const ABI = require('web3-eth-abi');

const { expect } = chai;

function randomAccount(balance = 0) {
  const { address, privateKey } = randomEthAccount();
  const account = new Account({
    address,
    nonce: 0,
    balance,
    signers: [address]
  });
  account.privateKey = privateKey;
  return account;
}

function encodeStateProof(accountIndex, data, siblings): string {
  return ABI.encodeParameter(
    {
      'StateProof': {
        'data': 'bytes',
        'accountIndex': 'uint256',
        'siblings': 'bytes32[]'
      }
    },
    {accountIndex, data, siblings}
  );
}

export const test = () => describe('AccountLib.sol Test', async () => {
  let from, web3, tester: Tester, accountLib;
  before(async () => {
    ({from, web3, tester} = await Tester.create());
    const contracts = compile(__dirname, 'AccountLib.sol', __dirname);
    accountLib = await deploy(web3, from, { contracts, name: 'AccountLib' });
  })

  it('Should prove the state of an account.', async () => {
    const state = await tester.newState();
    const account = randomAccount();
    const index = await state.putAccount(account);
    const { rootHash, value, siblings } = await state.getAccountProof(index);
    const proof = encodeStateProof(index, value, siblings);
    const { accountIndex, empty, account: outputAccount } = await accountLib.methods.verifyAccountInState(toHex(rootHash), proof).call();
    const { contractAddress, nonce, balance, signers } = outputAccount;
    const inputHex = value.toString('hex');
    const outputHex = new Account({
      address: contractAddress,
      nonce: +nonce,
      balance: +balance,
      signers
    }).encode().toString('hex');
    expect(outputHex).to.eql(inputHex);
    expect(index).to.eql(+accountIndex);
    expect(empty).to.be.false;
  })
});

if (process.env.NODE_ENV != 'all' && process.env.NODE_ENV != 'coverage') test();