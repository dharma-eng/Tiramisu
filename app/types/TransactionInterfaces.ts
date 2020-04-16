export interface Transaction {
    prefix: number;
    value: number,
    intermediateStateRoot?: string,
}

export interface HardTransaction extends Transaction {
    hardTransactionIndex: number,
}

export interface SoftTransaction extends Transaction {
    nonce: number,
    signature: string,
}

export interface CreateTransaction extends Transaction{
    contractAddress: string,
    signerAddress: string,
    accountIndex: number,
}
