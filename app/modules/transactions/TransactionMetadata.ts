import { TransactionMetadataType, Transactions } from "./interfaces";
import {toNonPrefixed, toHex, toInt, toBuf} from "../../lib";

const keys = [
    'hardCreates',
    'hardDeposits',
    'hardWithdrawals',
    'hardAddSigners',
    'softWithdrawals',
    'softCreates',
    'softTransfers',
    'softChangeSigners'
];

const sizes = [
    88, 48, 68, 61, 131, 155, 115, 125
];

const objToArray = (obj: object): any[] => keys.map(k => obj[k] || 0);
const arrToObject = (arr: any[]): object => arr.reduce((o, v, i) => ({
    ...o,
    [keys[i]]: v
}), {});
const strToArray = (str: string): any[] => toNonPrefixed(str).match(/.{4}/g).map((x) => toInt(`0x${x}`));
const arrToBuffer = (arr: any[]): Buffer => Buffer.concat(arr.map(v => toBuf(v, 2)));

export class TransactionMetadata implements TransactionMetadataType {
    metadata: object;
    hardCreates: number;
    hardDeposits: number;
    hardWithdrawals: number;
    hardAddSigners: number;
    softWithdrawals: number;
    softCreates: number;
    softTransfers: number;
    softChangeSigners: number;
    constructor(metadata: any) {
        const _metadata =
            (typeof metadata == 'string' && arrToObject(strToArray(metadata))) ||
            (Array.isArray(metadata) && arrToObject(metadata)) ||
            (Buffer.isBuffer(metadata) && arrToObject(strToArray(toHex(metadata)))) ||
            (typeof metadata == 'object' && metadata);
        Object.assign(this, _metadata);
        this.metadata = _metadata;
    }

    get hardTransactionsCount(): number {
        return keys.slice(0, 4).map(k => this.metadata[k]).reduce((a, b) => a+b, 0)
    }

    get expectedLength(): number {
        return keys.reduce((sum, k, i) => sum + (this.metadata[k] * sizes[i]), 0);
    }

    encode(): Buffer {
        return arrToBuffer(objToArray(this.metadata));
    }

    static decode(str: string): TransactionMetadata {
        return new TransactionMetadata(str);
    }

    static fromTransactions(transactions: Transactions): TransactionMetadata {
        return new TransactionMetadata(
            keys.reduce((o, k) => ({
                ...o,
                [k]: (transactions[k] || []).length
            }), {})
        );
    }
}

export default TransactionMetadata;
