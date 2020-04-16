// const { deploy } = require('../utils/test-utils/web3');
const {
  decodeHardTransactions,
  sortTransactions,
  compileBaseMock
} = require("./lib");
const { Block } = require("./types");
const StateMachine = require("./state/StateMachine");

class Blockchain {
  constructor({ web3, fromAddress, dai, peg, state }) {
    this.queue = [];
    this.hardTransactionsIndex = 0;
    this.maxHardTransactions = 10;
    this.address = fromAddress;
    this.web3 = web3;
    this.dai = dai;
    this.peg = peg;
    this.state = state;
    this.stateMachine = new StateMachine(state);
    this.version = 0;
    this.blockNumber = 0;
  }

  async getHardTransactions() {
    /* only deposits and creates supported for now */
    const hardTransactions = await this.peg.methods
      .getHardTransactionsFrom(
        this.hardTransactionsIndex,
        this.maxHardTransactions
      )
      .call();
    const arr = await decodeHardTransactions(
      this.state,
      this.hardTransactionsIndex,
      hardTransactions
    );
    return arr;
  }

  async getTransactions() {
    const hardTransactions = await this.getHardTransactions();
    let softTransactions;
    if (this.queue.length) {
      softTransactions = [...this.queue];
      this.queue = [];
    } else softTransactions = [];
    const transactions = sortTransactions([
      ...hardTransactions,
      ...softTransactions
    ]);
    return transactions;
  }

  queueTransaction(transaction) {
    return new Promise(async (resolve, reject) => {
      transaction.assignResolvers(resolve, reject);
      this.queue.push(transaction);
    });
  }

  async processBlock() {
    const { hardTransactionsIndex, version } = this;
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
    const receipt = await this.peg.methods
      .submitBlock(block)
      .send({ gas: 5e6, from: this.address });
    const {
      events: {
        BlockSubmitted: { blockNumber }
      }
    } = receipt;
    block.addOutput(blockNumber);
  }

  async confirmBlock(block) {
    const header = block.commitment;
    await this.peg.methods
      .confirmBlock(header)
      .send({ gas: 5e6, from: this.address });
  }
}

module.exports = Blockchain;
