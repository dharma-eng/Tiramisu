export interface Transaction {
    prefix: number;
    intermediateStateRoot?: string;
    accountIndex: number;
    encode(prefix: boolean): Buffer; //encode function
}

export interface CreateTransaction {
    accountAddress: string;
    initialSigningKey: string;
}

/**
 * Hard Transactions -
 *      Hard Create
 *      Hard Deposit
 *      Hard Withdraw
 *      Hard Add Signer
 */

export interface HardTransaction extends Transaction {
    hardTransactionIndex: number;
}

export interface HardDepositTransaction extends HardTransaction {
    value: number;
}

export interface HardCreateTransaction extends HardDepositTransaction, CreateTransaction {
}

export interface HardWithdrawTransaction extends HardTransaction {
    value: number;
}

export interface HardAddSignerTransaction extends HardTransaction {
    signingAddress: string;
}


/**
 * Soft Transactions -
 *      Soft Create
 *      Soft Transfer
 *      Soft Withdraw
 *      Soft Change Signer
 */

export interface SoftTransaction extends Transaction {
    nonce: number;
    signature: string;
}

export interface SoftTransferTransaction extends SoftTransaction {
    toAccountIndex: number;
    value: number;
}

export interface SoftCreateTransaction extends SoftTransferTransaction, CreateTransaction {
}

export interface SoftWithdrawTransaction extends SoftTransaction {
    withdrawalAddress: string;
    value: number;
}

export interface SoftChangeSignerTransaction extends SoftTransaction {
    signingAddress: string;
    modificationCategory: number;
}
