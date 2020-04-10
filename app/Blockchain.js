const { deploy } = require('../utils/test-utils/web3');
const { getMerkleRoot } = require('../utils/merkle');
const { compileBaseMock } = require('./lib/compile');
const sortTransactions = require('./lib/transaction-sort');
const { HardCreate, HardDeposit } = require('./types')
const State = require('./state/State')
const contracts = compileBaseMock();

class Blockchain {
  constructor(web3, fromAddress, peg, state) {
    this.queue = [];
    this.hardTransactionIndex = 0;
    this.maxHardTransactions = 10;
    this.address = fromAddress;
    this.web3 = web3;
    this.peg = peg;
    this.state = state;
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
    const deposits = await this.peg.methods.getDepositsFrom(this.hardTransactionIndex, this.maxHardTransactions).call();
    const arr = [];
    for (let i = 0; i < deposits.length; i++) {
      const hardTransactionIndex = this.hardTransactionIndex + i;
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
    const {
      hardCreates,
      hardDeposits,
      hardWithdrawals,
      hardAddSigners,
      softWithdrawals,
      softCreates,
      softTransfers,
      softChangeSigners
    } = sortTransactions([...hardTransactions, ...softTransactions]);
    for (let hardCreate of hardCreates) {
      
    }
    // const softTransactions = 
  }

  queueTransaction(transaction) {
    return new Promise(async (resolve, reject) => {
      this.queue.push({
        prefix: transaction.prefix,
        transaction,
        resolve,
        reject
      });
    })
  }

  async getNextBlockInput() {
    const { version, queue, hardTransactionIndex, } = this;
    const hardTransactions = await this.getHardTransactions();
  }
}