import {AccountType} from "../account/interfaces";

export type Transaction = HardCreateTransaction |
    HardDepositTransaction |
    HardWithdrawTransaction |
    HardAddSignerTransaction |
    SoftWithdrawTransaction |
    SoftCreateTransaction |
    SoftTransferTransaction |
    SoftChangeSignerTransaction;

export interface CreateTransaction {
    accountAddress: string;
    initialSigningKey: string;
}

export interface BaseTransaction {
    prefix: number;
    intermediateStateRoot?: string;
    accountIndex: number;
    encode(prefix: boolean): Buffer;
    addOutput(intermediateStateRoot: string, accountIndex?: number): void;
    checkValid?(account: AccountType): string;
    assignResolvers?(resolve: () => void, reject: (errorMessage: string) => void): void;
}

/**
 * Hard Transactions -
 *      Hard Create
 *      Hard Deposit
 *      Hard Withdraw
 *      Hard Add Signer
 */

export interface HardTransaction extends BaseTransaction {
    hardTransactionIndex: number;
}

export interface HardCreateTransaction extends HardTransaction, CreateTransaction {
    prefix: 0;
    value: number;
}

export interface HardDepositTransaction extends HardTransaction {
    prefix: 1;
    value: number;
}

export interface HardWithdrawTransaction extends HardTransaction {
    callerAddress: string;
    prefix: 2;
    value: number;
}

export interface HardAddSignerTransaction extends HardTransaction {
    prefix: 3;
    signingAddress: string;
}


/**
 * Soft Transactions -
 *      Soft Create
 *      Soft Transfer
 *      Soft Withdraw
 *      Soft Change Signer
 */

export interface SoftTransaction extends BaseTransaction {
    nonce: number;
    signature: string;
    resolve: (argument?: any) => void;
    reject: (errorMessage: string) => void;
}

export interface SoftWithdrawTransaction extends SoftTransaction {
    prefix: 4;
    withdrawalAddress: string;
    value: number;
}

export interface SoftCreateTransaction extends SoftTransaction, CreateTransaction {
    prefix: 5;
    toAccountIndex: number;
    value: number;
}

export interface SoftTransferTransaction extends SoftTransaction {
    prefix: 6;
    toAccountIndex: number;
    value: number;
}

export interface SoftChangeSignerTransaction extends SoftTransaction {
    prefix: 7;
    signingAddress: string;
    modificationCategory: number;
}

//Interface for object containing each type of Transaction
export interface Transactions {
    hardCreates?: HardCreateTransaction[],
    hardDeposits?: HardDepositTransaction[],
    hardWithdrawals?: HardWithdrawTransaction[],
    hardAddSigners?: HardAddSignerTransaction[],
    softWithdrawals?: SoftWithdrawTransaction[],
    softCreates?: SoftCreateTransaction[],
    softTransfers?: SoftTransferTransaction[],
    softChangeSigners?: SoftChangeSignerTransaction[],
}

export interface TransactionMetadataType {
    metadata: object;
}


