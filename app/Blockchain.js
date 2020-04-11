const { deploy } = require('../utils/test-utils/web3');
const { getMerkleRoot } = require('../utils/merkle');
const { compileBaseMock } = require('./lib/compile');
const sortTransactions = require('./lib/transaction-sort');
const { Block, HardCreate, HardDeposit } = require('./types')
const State = require('./state/State');
const StateMachine = require('./state/StateMachine');
const contracts = compileBaseMock();

class Blockchain {
  constructor(web3, fromAddress, peg, state) {
    this.queue = [];
    this.hardTransactionsIndex = 0;
    this.maxHardTransactions = 10;
    this.address = fromAddress;
    this.web3 = web3;
    this.peg = peg;
    this.state = state;
    this.stateMachine = new StateMachine(state);
    this.version = 0;
    this.blockNumber = 0;
  }

  static async create(web3, fromAddress) {
    const peg = await deploy(web3, fromAddress, {
      contracts,
      name: 'MockDharmaPeg',
      arguments: []
    });
    const state = await State.create();
    return new Blockchain(web3, fromAddress, peg, state);
  }

  async getHardTransactions() {
    /* only deposits and creates supported for now */
    const deposits = await this.peg.methods.getDepositsFrom(this.hardTransactionsIndex, this.maxHardTransactions).call();
    const arr = [];
    for (let i = 0; i < deposits.length; i++) {
      const hardTransactionIndex = this.hardTransactionsIndex + i;
      const deposit = deposits[i];
      const accountIndex = await this.state.getAccountIndexByAddress(deposit.contractAddress)
      if (accountIndex != null) { 
        arr.push(new HardDeposit({
          hardTransactionIndex,
          accountIndex,
          ...deposit
        }));
      } else {
        arr.push(new HardCreate({
          hardTransactionIndex,
          ...deposit
        }))
      }
    }
    return arr;
  }

  async getTransactions() {
    const hardTransactions = await this.getHardTransactions();
    let softTransactions;
    if (this.queue.length) {
      softTransactions = [...this.queue];
      this.queue = [];
    } else softTransactions = [];
    const transactions = sortTransactions([...hardTransactions, ...softTransactions]);
    return transactions;
  }

  queueTransaction(transaction) {
    return new Promise(async (resolve, reject) => {
      transaction.assignResolvers(resolve, reject);
      this.queue.push(transaction);
    })
  }

  async processBlock() {
    const { hardTransactionsIndex, version, } = this;
    const transactions = await this.getTransactions();
    await this.stateMachine.execute(transactions);
    const stateSize = this.state.size;
    const stateRoot = await this.state.rootHash();
    
    const block = new Block({
      version,
      blockNumber: this.blockNumber,
      stateSize,
      stateRoot,
      hardTransactionsIndex,
      transactions
    });

    this.blockNumber += 1;
    this.hardTransactionsIndex = block.header.hardTransactionsCount;
    return block;
  }

  async submitBlock(block) {
    const receipt = await this.peg.methods.submitBlock(block).send({ gas: 5e6, from: this.address });
    const { events: { BlockSubmitted: { blockNumber } } } = receipt;
    block.addOutput(blockNumber);
  }

  async confirmBlock(block) {
    const header = block.commitment;
    await this.peg.methods.confirmBlock(header).send({ gas: 5e6, from: this.address });
  }

  async getDaiContract() {
    const address = await this.peg.methods.daiContract().call();
    const { abi } = contracts["interfaces/IERC20.sol"]["IERC20"];
    const daiContract = new this.web3.eth.Contract(abi, address);
    return daiContract;
  }
}

module.exports = Blockchain;