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
const { BigNumber } = require("sparse-merkle-tree");
const { toBuffer, setLength, bufferToHex } = require("ethereumjs-utils");
const getTree = require("./state-tree");
const Account = require("../types/Account");
const SimpleMemdown = require("../lib/simple-memdown");
class State {
  constructor(tree, size) {
    this.tree = tree;
    this.size = size;
    /* maps address to account index */
    this.accountMap = new SimpleMemdown();
  }
  static create() {
    return __awaiter(this, void 0, void 0, function*() {
      const tree = yield getTree(); //TODO: make more specific than "any"
      return new State(tree, 0);
    });
  }
  getAccountIndexByAddress(address) {
    return __awaiter(this, void 0, void 0, function*() {
      const index = yield this.accountMap.get(address);
      return index != null ? +index : null;
    });
  }
  /* takes number or big number, outputs account */
  getAccount(_accountIndex) {
    return __awaiter(this, void 0, void 0, function*() {
      const accountIndex = BigNumber.isBigNumber(_accountIndex)
        ? _accountIndex
        : new BigNumber(_accountIndex);
      if (accountIndex.gt(new BigNumber(this.size))) return null;
      const leaf = yield this.tree.getLeaf(accountIndex);
      return Account.decode(leaf);
    });
  }
  /* takes Account */
  putAccount(account) {
    return __awaiter(this, void 0, void 0, function*() {
      const haveAccount = (yield this.accountMap.get(account.address)) != null;
      if (haveAccount)
        throw new Error(
          `Account already exists for address ${account.address}`
        );
      const leaf = account.encode();
      const index = new BigNumber(this.size);
      yield this.tree.update(index, leaf);
      yield this.accountMap.put(account.address, this.size);
      this.size += 1;
      return this.size - 1;
    });
  }
  /* returns hex string */
  rootHash() {
    return __awaiter(this, void 0, void 0, function*() {
      const root = yield this.tree.getRootHash();
      return bufferToHex(root);
    });
  }
  /* takes BN or number for index and Account object */
  updateAccount(_accountIndex, account) {
    return __awaiter(this, void 0, void 0, function*() {
      const accountIndex = BigNumber.isBigNumber(_accountIndex)
        ? _accountIndex
        : new BigNumber(_accountIndex);
      const leaf = account.encode();
      yield this.tree.update(accountIndex, leaf);
    });
  }
}
module.exports = State;
