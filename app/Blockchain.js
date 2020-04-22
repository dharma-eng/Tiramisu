var __awaiter =
  (this && this.__awaiter) ||
  function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function(resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
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
  getHardTransactions() {
    return __awaiter(this, void 0, void 0, function*() {
      /* only deposits and creates supported for now */
      const hardTransactions = yield this.peg.methods
        .getHardTransactionsFrom(
          this.hardTransactionsIndex,
          this.maxHardTransactions
        )
        .call();
      const arr = yield decodeHardTransactions(
        this.state,
        this.hardTransactionsIndex,
        hardTransactions
      );
      return arr;
    });
  }
  getTransactions() {
    return __awaiter(this, void 0, void 0, function*() {
      const hardTransactions = yield this.getHardTransactions();
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
    });
  }
  queueTransaction(transaction) {
    return new Promise((resolve, reject) =>
      __awaiter(this, void 0, void 0, function*() {
        transaction.assignResolvers(resolve, reject);
        this.queue.push(transaction);
      })
    );
  }
  processBlock() {
    return __awaiter(this, void 0, void 0, function*() {
      const { hardTransactionsIndex, version } = this;
      const transactions = yield this.getTransactions();
      yield this.stateMachine.execute(transactions);
      const stateSize = this.state.size;
      const stateRoot = yield this.state.rootHash();
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
    });
  }
  submitBlock(block) {
    return __awaiter(this, void 0, void 0, function*() {
      const receipt = yield this.peg.methods
        .submitBlock(block)
        .send({ gas: 5e6, from: this.address });
      const {
        events: {
          BlockSubmitted: { blockNumber }
        }
      } = receipt;
      block.addOutput(blockNumber);
    });
  }
  confirmBlock(block) {
    return __awaiter(this, void 0, void 0, function*() {
      const header = block.commitment;
      yield this.peg.methods
        .confirmBlock(header)
        .send({ gas: 5e6, from: this.address });
    });
  }
}
module.exports = Blockchain;
