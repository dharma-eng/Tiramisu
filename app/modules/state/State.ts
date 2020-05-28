import { BigNumber, SparseMerkleTree, MerkleTreeInclusionProof } from 'sparse-merkle-tree';
import { bufferToHex } from 'ethereumjs-util';
import fs from 'fs';
import path from 'path';
import { Account } from "../account";
import { getTree } from './state-tree';
import SimpleLevel, { LevelSideways } from '../../lib/simple-level';
import { toBuf, toHex, BufferLike } from '../../lib';

export type AccountProof = {
    accountIndex: number;
    data: BufferLike;
    siblings: BufferLike[];
}

export interface State {
    tree: SparseMerkleTree;
    accountMap: SimpleLevel; //TODO: make this more specific than "any"
    size: number;
    getAccountIndexByAddress(address: string): Promise<number>;
    getAccount(_accountIndex: any): Promise<Account>;
    getAccountProof(accountIndex: number): Promise<AccountProof>
    putAccount(account: Account): Promise<number>;
    rootHash(): Promise<string>;
    updateAccount(_accountIndex: any, account: Account): Promise<void>;
}

export type StateOptions = {
    dbPath?: string;
}

export class State {
    constructor(
        private _stateDB: LevelSideways,
        public tree: SparseMerkleTree,
        public accountMap: SimpleLevel,
        public size: number,
        private dbPath?: string
    ) {}

    async copy(): Promise<State> {
        const stateCopy = await this._stateDB.copy();
        const accountCopy = await this.accountMap.copy();
        const treeCopy = await getTree(stateCopy, toBuf(await this.rootHash()));
        const size = this.size;
        return new State(stateCopy, treeCopy, accountCopy, size);
    }

    static async create(dbPath?: string, rootHash?: string): Promise<State> {
        if  (rootHash == '0x78ccaaab73373552f207a63599de54d7d8d0c1805f86ce7da15818d09f4cff62') rootHash = null;
        let statePath: string;
        let makeCopy = false;
        if (dbPath && rootHash) {
            statePath = path.join(dbPath, rootHash);
            if (!fs.existsSync(statePath)) statePath = dbPath;
            else makeCopy = true;
        } else if (dbPath) {
            statePath = dbPath;
            if (!fs.existsSync(statePath)) fs.mkdirSync(statePath);
        }
        let accountMap = new SimpleLevel('account-map', statePath);
        let stateDB = new LevelSideways(statePath ? path.join(statePath, 'state') : undefined);
        let tree = await getTree(stateDB, rootHash ? toBuf(rootHash) : undefined);
        let size = +(await accountMap.get('account-size')) || 0;
        const state = new State(stateDB, tree, accountMap, size, dbPath);
        if (!makeCopy) return state;
        const copy = await state.copy();
        await state.close();
        return copy;
    }

    async commit(dbPath: string = this.dbPath) {
        if (!dbPath) throw new Error(`In memory commits not supported yet!`);
        const rootHash = await this.rootHash();
        const statePath = path.join(dbPath, rootHash);
        if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath)
        if (statePath && !fs.existsSync(statePath)) fs.mkdirSync(statePath);
        const adb = await this._stateDB.copy(path.join(statePath, 'state'));
        const sdb = await this.accountMap.db.copy(path.join(statePath, 'account-map'));
        await adb.close();
        await sdb.close();
    }

    async getAccountIndexByAddress(address: string): Promise<number> {
        const index = await this.accountMap.get(address) as number;
        return (index != null) ? +index : null;
    }

    /* takes number or big number, outputs account */
    async getAccount(_accountIndex: any): Promise<Account> {
        const accountIndex = BigNumber.isBigNumber(_accountIndex) ? _accountIndex : new BigNumber(_accountIndex);
        if (accountIndex.gte(new BigNumber(this.size))) return null;
        const leaf = await this.tree.getLeaf(accountIndex) as Buffer;
        return Account.decode(leaf);
    }

    async getAccountProof(accountIndex: number): Promise<AccountProof> {
        const account = await this.getAccount(accountIndex);
        const leaf = account ? account.encode() : Buffer.alloc(32).fill('\x00');
        const { value, siblings } = await this.tree.getMerkleProof(new BigNumber(accountIndex), leaf);
        return { accountIndex, data: value, siblings };
    }

    /* takes Account */
    async putAccount(account: Account): Promise<number> {
        const haveAccount = (await this.accountMap.get(account.address)) != null as boolean;
        if (haveAccount) throw new Error(`Account already exists for address ${account.address}`);
        const leaf = account.encode() as Buffer;
        const index = new BigNumber(this.size);
        await this.tree.update(index, leaf);
        await this.accountMap.put(account.address, this.size);
        this.size += 1;
        await this.accountMap.put('account-size', this.size);
        return this.size - 1;
    }

    /* returns hex string */
    async rootHash(): Promise<string> {
        const root = await this.tree.getRootHash() as Buffer;
        return bufferToHex(root);
    }

    /* takes BN or number for index and Account object */
    async updateAccount(_accountIndex: any, account: Account): Promise<void> {
        const accountIndex = BigNumber.isBigNumber(_accountIndex) ? _accountIndex : new BigNumber(_accountIndex);
        const leaf = account.encode() as Buffer;
        await this.tree.update(accountIndex, leaf);
    }

    close = (): Promise<void> => Promise.all([this._stateDB.close(), this.accountMap.close()]).then(() => {});
}

export default State;
