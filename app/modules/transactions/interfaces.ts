import {AccountType} from "../account/interfaces";
// import HardCreate from "./hard-create";
// import HardDeposit from "./hard-deposit";
// import HardWithdraw from "./hard-withdrawal";
// import HardAddSigner from "./hard-add-signer";
// import SoftWithdrawal from "./soft-withdrawal";
// import SoftCreate from "./soft-create";
// import SoftTransfer from "./soft-transfer";
// import SoftChangeSigner from "./soft-change-signer";
import {
    HardCreate, HardCreateData,
    HardDeposit, HardDepositData,
    HardWithdraw, HardWithdrawData,
    HardAddSigner, HardAddSignerData,
    SoftWithdrawal, SoftWithdrawalData,
    SoftCreate, SoftCreateData,
    SoftTransfer, SoftTransferData,
    SoftChangeSigner, SoftChangeSignerData,
} from './index';

import { JsonType } from "../../lib/simple-level";

export type Transaction = HardCreate | HardDeposit | HardWithdraw | HardAddSigner |
    SoftWithdrawal | SoftCreate | SoftTransfer | SoftChangeSigner;

export type TransactionData = HardCreateData | HardDepositData | HardWithdrawData | HardAddSignerData |
    SoftWithdrawalData | SoftCreateData | SoftTransferData | SoftChangeSignerData

export interface CreateTransaction {
    accountAddress: string;
    initialSigningKey: string;
}

export interface BaseTransaction {
    prefix: number;
    intermediateStateRoot?: string;
    accountIndex?: number;
    encode(prefix: boolean): Buffer;
    addOutput(intermediateStateRoot: string, accountIndex?: number): void;
    checkValid?(account: AccountType): string;
    assignResolvers?(resolve: () => void, reject: (errorMessage: string) => void): void;
    toJSON(): JsonType;
}

export interface HardTransaction extends BaseTransaction {
    hardTransactionIndex: number;
}

export interface SoftTransaction extends BaseTransaction {
    nonce: number;
    accountIndex: number;
    signature: string;
    resolve: (argument?: any) => void;
    reject: (errorMessage: string) => void;
}

//Interface for object containing each type of Transaction
export type TransactionsJson = {
    hardCreates?: HardCreateData[],
    hardDeposits?: HardDepositData[],
    hardWithdrawals?: HardWithdrawData[],
    hardAddSigners?: HardAddSignerData[],
    softWithdrawals?: SoftWithdrawalData[],
    softCreates?: SoftCreateData[],
    softTransfers?: SoftTransferData[],
    softChangeSigners?: SoftChangeSignerData[],
}

export type Transactions = {
    hardCreates?: HardCreate[],
    hardDeposits?: HardDeposit[],
    hardWithdrawals?: HardWithdraw[],
    hardAddSigners?: HardAddSigner[],
    softWithdrawals?: SoftWithdrawal[],
    softCreates?: SoftCreate[],
    softTransfers?: SoftTransfer[],
    softChangeSigners?: SoftChangeSigner[],
}

export interface TransactionMetadataType {
    metadata: object;
}


