import { MerkleTreeInclusionProof, SparseMerkleTree } from "sparse-merkle-tree";
import { AccountType } from "../account/interfaces";

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
