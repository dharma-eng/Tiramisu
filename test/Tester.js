const { getWeb3, randomAccount } = require("./utils");
const {
  getContractsFromExternalHost,
  deployContracts
} = require("./contracts");
const { Account, State, Blockchain, StateMachine } = require("../app");

const defaultOptions = {
  state: false,
  blockchain: false,
  web3: true,
  stateMachine: false
};

class Tester {
  constructor({ accounts, from, web3, usingExternalHost, networkID } = {}) {
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

  newState() {
    return State.create();
  }

  async newStateMachine() {
    const state = await this.newState();
    return new StateMachine(state);
  }

  async newBlockchain() {
    const { dai, peg } = this.usingExternalHost
      ? await getContractsFromExternalHost()
      : await deployContracts(this);
    // await deployContracts(this);
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

  static async create(opts = {}) {
    let { state, blockchain, web3, stateMachine } = {
      ...defaultOptions,
      ...opts
    };
    let res = {};
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
    if (blockchain) blockchain = await tester.newBlockchain();
    return {
      blockchain,
      state,
      stateMachine,
      tester,
      ...res
    };
  }
}

module.exports = Tester;
