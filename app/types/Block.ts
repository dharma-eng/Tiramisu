import { Transactions } from "./TransactionInterfaces";
import { toBuf, toHex, keccak256 } from '../lib';
import { encodeBlock } from "../lib/block-coder";

interface BlockParameters {
    version: number,
    blockNumber: number,
    stateSize: number,
    stateRoot: string,
}

interface BlockArguments extends BlockParameters {
    hardTransactionsIndex: number,
    transactions: Transactions,
}

export interface Header extends BlockParameters {
    hardTransactionsCount: number,
    transactionsRoot: Buffer
}

export interface Commitment extends Header {
    transactionsHash: string,
    submittedAt: number,
}

export interface BlockType {
    transactionsData: Buffer;
    header: Header;
    commitment: Commitment;
    transactions: Transactions;
    addOutput(submittedAt: number): void;
    blockHash(web3): string;
}

export class Block implements BlockType {
    transactionsData: Buffer;
    header: Header;
    commitment: Commitment;
    transactions: Transactions;
    constructor(args: BlockArguments) {
        const { header, transactionsData } = encodeBlock(args);

        this.transactions = args.transactions;
        this.header = header;
        this.transactionsData = transactionsData;
    }

    addOutput(submittedAt: number): void {
        this.commitment = {
            ...this.header,
            transactionsHash: toHex(keccak256(this.transactionsData)),
            submittedAt
        };
    }

    /* Currently just using ABI for this. */
    blockHash(web3): string {
        if (!this.commitment) {
            throw new Error(
                "Blockhash not available! Requires calling `addOutput` with the block number from submission to L1."
            );
        }
        const structDef = {
            BlockHeader: {
                version: "uint16",
                blockNumber: "uint32",
                stateSize: "uint32",
                stateRoot: "bytes32",
                hardTransactionsCount: "uint40",
                transactionsRoot: "bytes32",
                transactionsHash: "bytes32",
                submittedAt: "uint256"
            }
        };
        const data = toBuf(
            web3.eth.abi.encodeParameter(structDef, this.commitment)
        ) as Buffer;
        return toHex(keccak256(data));
    }
}

export default Block;
