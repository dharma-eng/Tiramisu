import { Transactions } from "../transactions";
import { toBuf, toHex, keccak256 } from '../../lib';
import { encodeBlock } from "../../lib/block-coder";
import { BlockArguments, BlockType, Commitment, Header } from "./interfaces";

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
export * from "./interfaces";
