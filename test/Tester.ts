import { Account, State, Blockchain, StateMachine } from '../app';
import { ProofBlockchain } from './utils/ProofBlockchain';
const { getWeb3, randomAccount } = require("./utils");
const {
  getContractFromExternalHost,
  getContractsFromExternalHost,
  deployContract,
  deployContracts
} = require("./contracts");

const defaultOptions = {
  state: false,
  blockchain: false,
  web3: true,
  stateMachine: false
};

export interface TesterInput {
  accounts?: string[];
  from?: string;
  web3?: any;
  usingExternalHost?: boolean;
  networkID?: string | number;
}

export class Tester {
  accounts: string[];
  from: string;
  web3: any;
  usingExternalHost: boolean;
  networkID: string | number;
  constructor({ accounts, from, web3, usingExternalHost, networkID }: TesterInput = {}) {
    this.accounts = accounts;
    this.from = from;
    this.web3 = web3;
    this.usingExternalHost = usingExternalHost;
    this.networkID = networkID;
  }

  randomAccount(balance = 0) {
    const { address, privateKey } = randomAccount();
    const account = new Account({
      address,
      nonce: 0,
      balance,
      signers: [address]
    });
    account.privateKey = privateKey;
    return account;
  }

  newState(): Promise<State> {
    return State.create();
  }

  async newStateMachine() {
    const state = await this.newState();
    return new StateMachine(state);
  }

  deployContract(name, args = []) {
    return this.usingExternalHost
      ? getContractFromExternalHost(name, args)
      : deployContract(this, name, args);
  }

  async newBlockchain() {
    const { dai, peg } = this.usingExternalHost
      ? await getContractsFromExternalHost()
      : await deployContracts(this);
    if (this.usingExternalHost) await peg.methods.resetChain().send({ from: this.from, gas: 5e6 });
    await dai.methods
      .freeCoins(peg.options.address, 5000)
      .send({ from: this.from, gas: 5e6 });
    const state = await this.newState();
    return new Blockchain({
      web3: this.web3,
      fromAddress: this.from,
      dai,
      peg,
      state
    });
  }

  async newProofBlockchain() {
    const { dai, peg } = this.usingExternalHost
      ? await getContractsFromExternalHost()
      : await deployContracts(this);
    if (this.usingExternalHost) await peg.methods.resetChain().send({ from: this.from, gas: 6e6 });
    await dai.methods
      .freeCoins(peg.options.address, 5000)
      .send({ from: this.from, gas: 6e6 });
    const state = await this.newState();
    return new ProofBlockchain({
      web3: this.web3,
      fromAddress: this.from,
      dai,
      peg,
      state
    });
  }

  static async create(opts = {}) {
    let { state, blockchain, web3, stateMachine }: any = {
      ...defaultOptions,
      ...opts
    };
    let res: any = {};
    let tester = new Tester();
    if (web3 || blockchain) {
      res = await getWeb3();
      Object.assign(tester, res);
      let { dai, peg } = res.usingExternalHost
        ? await getContractsFromExternalHost(tester)
        : await deployContracts(tester);
      Object.assign(res, { dai, peg });
    }

    if (state) state = await tester.newState();
    if (stateMachine) stateMachine = await tester.newStateMachine();
    if (blockchain) blockchain = await tester.newProofBlockchain();
    return {
      blockchain,
      state,
      stateMachine,
      tester,
      ...res
    };
  }
}

export default Tester;