import {Transaction} from "../transactions";
import {State} from "../state";

export interface BlockchainType {
  queue: Transaction[];
  hardTransactionsIndex: number;
  maxHardTransactions: number;
  address: string;
  web3: any;
  dai: any;
  peg: any;
  state: State;
  stateMachine: any; //TODO: update to StateMachine type
  version: number;
  blockNumber: number;
}
