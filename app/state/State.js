const { BigNumber } = require('sparse-merkle-tree');
const { toBuffer, setLength, bufferToHex } = require('ethereumjs-utils');
const getTree = require('./state-tree');
const Account = require('../types/Account');
const SimpleMemdown = require('../lib/simple-memdown');

class State {
  constructor(tree, size) {
    this.tree = tree;
    this.size = size;
    /* maps address to account index */
    this.accountMap = new SimpleMemdown()
  }

  static async create() {
    const tree = await getTree();
    return new State(tree, 0)
  }

  async getAccountIndexByAddress(address) {
    const index = await this.accountMap.get(address);
    return (index != null) ? +index : null;
  }

  /* takes number or big number, outputs account */
  async getAccount(_accountIndex) {
    const accountIndex = BigNumber.isBigNumber(_accountIndex) ? _accountIndex : new BigNumber(_accountIndex);
    if (accountIndex.gt(new BigNumber(this.size))) return null;
    const leaf = await this.tree.getLeaf(accountIndex);
    return Account.decode(leaf);
  }

  /* takes Account */
  async putAccount(account) {
    const haveAccount = (await this.accountMap.get(account.address)) != null;
    if (haveAccount) throw new Error(`Account already exists for address ${account.address}`)
    const leaf = account.encode();
    const index = new BigNumber(this.size);
    await this.tree.update(index, leaf);
    await this.accountMap.put(account.address, this.size);
    this.size += 1;
    return this.size - 1;
  }

  /* returns hex string */
  async rootHash() {
    const root = await this.tree.getRootHash();
    return bufferToHex(root);
  }

  /* takes BN or number for index and Account object */
  async updateAccount(_accountIndex, account) {
    const accountIndex = BigNumber.isBigNumber(_accountIndex) ? _accountIndex : new BigNumber(_accountIndex);
    const leaf = account.encode();
    await this.tree.update(accountIndex, leaf);
  }
}

module.exports = State;