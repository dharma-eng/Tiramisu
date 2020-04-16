import {HardTransaction, SoftTransaction, Transaction} from "./TransactionInterfaces";
import {HardCreate} from "./HardCreate";
const { getMerkleRoot } = require("../lib/merkle");
const { toBuf, toHex } = require("../lib/to");
const TransactionsMetadata = require("./TransactionMetadata");
const { keccak256 } = require("ethereumjs-utils");

const keys = [
    "hardCreates",
    "hardDeposits",
    "hardWithdrawals",
    "hardAddSigners",
    "softWithdrawals",
    "softCreates",
    "softTransfers",
    "softChangeSigners"
];

interface BlockParameters {
    version: number,
    blockNumber: number,
    stateSize: number,
    stateRoot: string,
}

interface Transactions {
    hardCreates: HardCreate[],
    hardDeposits: HardTransaction[],
    hardWithdrawals: HardTransaction[],
    hardAddSigners: HardTransaction[],
    softWithdrawals: SoftTransaction[],
    softCreates: SoftTransaction[],
    softTransfers: SoftTransaction[],
    softChangeSigners: SoftTransaction[],
}

interface BlockArguments extends BlockParameters {
    hardTransactionsIndex: number,
    transactions: Transactions,
}

interface Header extends BlockParameters {
    hardTransactionsCount: number,
    transactionsRoot: Buffer
}

interface Commitment extends Header {
    transactionsHash: string,
    submittedAt: number,
}

class Block {
    transactionsData: Buffer;
    header: Header;
    commitment: Commitment;
    transactions: Transactions;
    constructor(args: BlockArguments) {
        const {
            version,
            blockNumber,
            stateSize,
            stateRoot,
            hardTransactionsIndex,
            transactions
        } = args;

        this.transactions = transactions;

        const transactionsArray = keys.reduce(
            (arr, key) => [...arr, ...transactions[key]],
            []
        ) as Transaction[];

        /* Encode transactions with their prefixes, calculate merkle root. */
        const leaves = transactionsArray.map(t => t.encode(true)) as Buffer[];
        const transactionsRoot = getMerkleRoot(leaves) as Buffer;

        /* Encode transactions without their prefixes and concatenate them. Place the encoded metadata at the beginning. */
        const transactionsMetadata = TransactionsMetadata.fromTransactions(
            transactions
        );
        const transactionsBuffer = Buffer.concat(
            transactionsArray.map(t => t.encode(false))
        );
        const transactionsData = Buffer.concat([
            transactionsMetadata.encode(),
            transactionsBuffer
        ]);

        /* Add the hard transactions count from this block to the previous total. */
        const hardTransactionsCount =
            hardTransactionsIndex + transactionsMetadata.hardTransactionsCount as number;
        this.header = {
            version,
            blockNumber,
            stateSize,
            hardTransactionsCount: hardTransactionsCount,
            stateRoot,
            transactionsRoot
        };
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

module.exports = Block;
