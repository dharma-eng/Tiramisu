import { Transactions } from "../transactions";
import { toBuf, toHex, keccak256, fromTransactionsJson } from '../../lib';
import { encodeBlock } from "../../lib/block-coder";
import { Commitment, Header, BlockInput, BlockJson } from "./interfaces";
const ABI = require('web3-eth-abi');

export interface Block {
    transactionsData: Buffer;
    header: Header;
    commitment: Commitment;
    transactions: Transactions;
    addOutput(submittedAt: number): void;
    blockHash(): string;
}

export class Block {
    transactionsData: Buffer;
    header: Header;
    commitment: Commitment;
    transactions: Transactions;

    constructor(args: BlockInput) {
        if ('version' in args) {
            const { header, transactionsData } = encodeBlock(args);
            this.transactions = args.transactions;
            this.header = header;
            this.transactionsData = transactionsData;
        } else {
            const { commitment, transactions: transactionsJson } = args;
            const { submittedAt, transactionsHash, ...header } = commitment;
            const transactionsRoot = toBuf(header.transactionsRoot);
            
            this.header = { ...header, transactionsRoot };
            this.commitment = { ...commitment, transactionsRoot };
            const { transactions, transactionsData } = fromTransactionsJson(transactionsJson);
            this.transactions = transactions;
            this.transactionsData = transactionsData;
        }
    }

    addOutput(submittedAt: number): void {
        this.commitment = {
            ...this.header,
            transactionsHash: toHex(keccak256(this.transactionsData)),
            submittedAt
        };
    }

    /* Currently just using ABI for this. */
    blockHash(): string {
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
        const data = toBuf(ABI.encodeParameter(structDef, this.commitment));
        return toHex(keccak256(data));
    }

    toJSON = (): BlockJson => ({
        commitment: {
            ...this.commitment,
            transactionsRoot: toHex(this.commitment.transactionsRoot)
        },
        transactions: this.transactions
    });
}

export default Block;
export * from "./interfaces";
