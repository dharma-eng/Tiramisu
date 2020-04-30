import { BigNumber, SparseMerkleTree, MerkleTreeInclusionProof } from 'sparse-merkle-tree';
import { bufferToHex } from 'ethereumjs-util';
import {AccountType, Account} from "../types/Account";
import getTree from './state-tree';
import SimpleMemdown from '../lib/simple-memdown';

export interface StateType {
    tree: SparseMerkleTree;
    accountMap: any; //TODO: make this more specific than "any"
    size: number;
    getAccountIndexByAddress(address: string): Promise<number>;
    getAccount(_accountIndex: any): Promise<AccountType>;
    putAccount(account: AccountType): Promise<number>;
    rootHash(): Promise<string>;
    updateAccount(_accountIndex: any, account: AccountType): Promise<void>;
    getAccountProof(accountIndex: number): Promise<MerkleTreeInclusionProof>;

}
export class State implements StateType {
    tree: SparseMerkleTree;
    size: number;
    accountMap: any;

    constructor(tree, size) {
        this.tree = tree;
        this.size = size;
        /* maps address to account index */
        this.accountMap = new SimpleMemdown()
    }

    static async create(): Promise<State> {
        const tree = await getTree() as any; //TODO: make more specific than "any"
        return new State(tree, 0);
    }

    async getAccountIndexByAddress(address: string): Promise<number> {
        const index = await this.accountMap.get(address) as number;
        return (index != null) ? +index : null;
    }

    /* takes number or big number, outputs account */
    async getAccount(_accountIndex: any): Promise<AccountType> {
        const accountIndex = BigNumber.isBigNumber(_accountIndex) ? _accountIndex : new BigNumber(_accountIndex);
        if (accountIndex.gte(new BigNumber(this.size))) return null;
        const leaf = await this.tree.getLeaf(accountIndex) as Buffer;
        return Account.decode(leaf);
    }

    /* takes Account */
    async putAccount(account: AccountType): Promise<number> {
        const haveAccount = (await this.accountMap.get(account.address)) != null as boolean;
        if (haveAccount) throw new Error(`Account already exists for address ${account.address}`);
        const leaf = account.encode() as Buffer;
        const index = new BigNumber(this.size);
        await this.tree.update(index, leaf);
        await this.accountMap.put(account.address, this.size);
        this.size += 1;
        return this.size - 1;
    }

    /* returns hex string */
    async rootHash(): Promise<string> {
        const root = await this.tree.getRootHash() as Buffer;
        return bufferToHex(root);
    }

    /* takes BN or number for index and Account object */
    async updateAccount(_accountIndex: any, account: AccountType): Promise<void> {
        const accountIndex = BigNumber.isBigNumber(_accountIndex) ? _accountIndex : new BigNumber(_accountIndex);
        const leaf = account.encode() as Buffer;
        await this.tree.update(accountIndex, leaf);
    }

    async getAccountProof(accountIndex: number): Promise<MerkleTreeInclusionProof> {
        return this.tree.getMerkleProof(new BigNumber(accountIndex), (await this.getAccount(accountIndex)).encode());
    }
}

export default State;
