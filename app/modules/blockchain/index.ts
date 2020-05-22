// const { deploy } = require('../utils/test-utils/web3');
import { decodeHardTransactions, sortTransactions } from "../../lib";
import {Transaction, Transactions} from "../transactions";
import {State, StateMachine} from "../state";
import { Block } from '../block'
import { BlockchainType } from "./interfaces";

export class Blockchain implements BlockchainType {
    queue: Transaction[];
    hardTransactionsIndex: number;
    maxHardTransactions: number;
    address: string;
    web3: any;
    token: any;
    tiramisuContract: any;
    state: State;
    stateMachine: any; //TODO: update to StateMachine type
    version: number;
    blockNumber: number;

    constructor({ web3, fromAddress, token, tiramisuContract, state }) {
        this.queue = [];
        this.hardTransactionsIndex = 0;
        this.maxHardTransactions = 10;
        this.address = fromAddress;
        this.web3 = web3;
        this.token = token;
        this.tiramisuContract = tiramisuContract;
        this.state = state;
        this.stateMachine = new StateMachine(state);
        this.version = 0;
        this.blockNumber = 0;
    }

    async getHardTransactions(): Promise<Transaction[]> {
        /* only deposits and creates supported for now */
        const hardTransactions = await this.tiramisuContract.methods
            .getHardTransactionsFrom(
                this.hardTransactionsIndex,
                this.maxHardTransactions
            )
            .call();
        const arr = await decodeHardTransactions(
            this.state,
            this.hardTransactionsIndex,
            hardTransactions
        ) as Transaction[];
        return arr;
    }

    async getTransactions(): Promise<Transactions> {
        const hardTransactions = await this.getHardTransactions() as Transaction[];
        let softTransactions;
        if (this.queue.length) {
            softTransactions = [...this.queue] as Transaction[];
            this.queue = [];
        } else softTransactions = [] as Transaction[];
        const transactions = sortTransactions([
            ...hardTransactions,
            ...softTransactions
        ]) as Transactions;
        return transactions;
    }

    queueTransaction(transaction: Transaction): Promise<any> {
        return new Promise(async (resolve, reject) => {
            transaction.assignResolvers(resolve, reject);
            this.queue.push(transaction);
        });
    }

    async processBlock(): Promise<Block> {
        const { hardTransactionsIndex, version } = this;
        const transactions = await this.getTransactions() as Transactions;
        await this.stateMachine.execute(transactions);
        const stateSize = this.state.size as number;
        const stateRoot = await this.state.rootHash() as string;

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

    async submitBlock(block: Block): Promise<void> {
        const receipt = await this.tiramisuContract.methods
            .submitBlock(block)
            .send({ gas: 5e6, from: this.address });
        const {
            events: {
                BlockSubmitted: { blockNumber }
            }
        } = receipt;
        block.addOutput(blockNumber);
    }

    async confirmBlock(block: Block): Promise<void> {
        const header = block.commitment;
        await this.tiramisuContract.methods
            .confirmBlock(header)
            .send({ gas: 5e6, from: this.address });
    }
}

export default Blockchain;
