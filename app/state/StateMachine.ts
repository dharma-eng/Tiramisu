import {StateType} from "./State";
import {
    HardAddSignerTransaction,
    HardCreateTransaction,
    HardDepositTransaction,
    HardWithdrawTransaction,
    SoftChangeSignerTransaction,
    SoftCreateTransaction,
    SoftTransferTransaction,
    SoftWithdrawTransaction,
    Transactions
} from "../types/TransactionInterfaces";
import {AccountType, Account} from "../types/Account";
import { toHex } from "../lib/to";

export interface StateMachine {
    state: StateType; 
}

export class StateMachine {
    constructor(state: StateType) {
        this.state = state;
    }

    async execute(transactions: Transactions): Promise<void> {
        const {
            hardCreates,
            hardDeposits,
            hardWithdrawals,
            hardAddSigners,
            softWithdrawals,
            softCreates,
            softTransfers,
            softChangeSigners
        } = transactions;

        /* Execute hard deposits. */
        if (hardCreates) {
            for (let transaction of hardCreates) await this.hardCreate(transaction);
        }

        /* Execute hard deposits. */
        if (hardDeposits) {
            for (let transaction of hardDeposits) await this.hardDeposit(transaction);
        }

        /* Execute hard withdrawals. */
        if (hardWithdrawals) {
            for (let transaction of hardWithdrawals) await this.hardWithdraw(transaction);
        }

        /* Execute hard add signers. */
        if (hardAddSigners) {
            for (let transaction of hardAddSigners) await this.hardAddSigner(transaction);
        }

        /* Execute soft withdrawals, remove any that are invalid. */
        if (softTransfers) {
            for (let i = 0; i < softTransfers.length; i++) {
                const transaction = softTransfers[i];
                const res = await this.softTransfer(transaction);
                if (!res) {
                    softTransfers.splice(i, 1);
                }
            }
        }

        /* Execute soft withdrawals, remove any that are invalid. */
        if (softWithdrawals) {
            for (let i = 0; i < softWithdrawals.length; i++) {
                const transaction = softWithdrawals[i];
                const res = await this.softWithdrawal(transaction);
                if (!res) {
                    softWithdrawals.splice(i, 1);
                }
            }
        }

        /* Execute soft withdrawals, remove any that are invalid. */
        if (softChangeSigners) {
            for (let i = 0; i < softChangeSigners.length; i++) {
                const transaction = softChangeSigners[i];
                const res = await this.softChangeSigner(transaction);
                if (!res) {
                    softChangeSigners.splice(i, 1);
                }
            }
        }

        /* Execute soft creates, remove any that are invalid. */
        if (softCreates) {
            for (let i = 0; i < softCreates.length; i++) {
                const transaction = softCreates[i];
                const res = await this.softCreate(transaction);
                if (!res) {
                    softCreates.splice(i, 1);
                }
            }
        }
    }

    async hardCreate(transaction: HardCreateTransaction): Promise<boolean> {
        const { accountAddress, initialSigningKey, value } = transaction;
        const account = new Account({
            address: accountAddress,
            nonce: 0,
            balance: value,
            signers: [initialSigningKey]
        }) as AccountType;
        const index = await this.state.putAccount(account) as number;
        const stateRoot = await this.state.rootHash() as string;
        transaction.addOutput(stateRoot, index);
        return true;
    }

    async hardDeposit(transaction: HardDepositTransaction): Promise<boolean> {
        const { accountIndex, value } = transaction;
        const account = await this.state.getAccount(accountIndex) as AccountType;
        account.balance += value;
        await this.state.updateAccount(accountIndex, account);
        const stateRoot = await this.state.rootHash() as string;
        transaction.addOutput(stateRoot, accountIndex);
        return true;
    }

    async hardWithdraw(transaction: HardWithdrawTransaction): Promise<boolean> {
        const { accountIndex, value } = transaction;
        const account = await this.state.getAccount(accountIndex) as AccountType;
        if (!account || transaction.checkValid(account)) {
            const stateRoot = `0x${"00".repeat(20)}`;
            transaction.addOutput(stateRoot);
            return false;
        }
        account.balance -= value;
        await this.state.updateAccount(accountIndex, account);
        const stateRoot = await this.state.rootHash() as string;
        transaction.addOutput(stateRoot, accountIndex);
        return true;
    }

    async hardAddSigner(transaction: HardAddSignerTransaction): Promise<boolean> {
        const { accountIndex, signingAddress } = transaction;
        const account = await this.state.getAccount(accountIndex) as AccountType;

        if (!account || transaction.checkValid(account)) {
            const stateRoot = `0x${"00".repeat(20)}`;
            transaction.addOutput(stateRoot);
            return false;
        }

        account.addSigner(signingAddress);
        await this.state.updateAccount(accountIndex, account);
        const stateRoot = await this.state.rootHash() as string;
        transaction.addOutput(stateRoot, accountIndex);
        return true;
    }

    async softTransfer(transaction: SoftTransferTransaction): Promise<boolean> {
        const { accountIndex, toAccountIndex, value } = transaction;
        const fromAccount = await this.state.getAccount(accountIndex) as AccountType;
        const toAccount = await this.state.getAccount(toAccountIndex) as AccountType;

        /* Verification */
        if (!fromAccount || !toAccount) {
            transaction.reject("Account does not exist.");
            return false;
        }
        const errorMessage = transaction.checkValid(fromAccount) as string
        if (errorMessage) {
            transaction.reject(errorMessage);
            return false;
        }

        /* Update caller account */
        fromAccount.nonce += 1;
        fromAccount.balance -= value;
        await this.state.updateAccount(accountIndex, fromAccount);

        /* Update receiver */
        toAccount.balance += value;
        await this.state.updateAccount(toAccountIndex, toAccount);
        const root = await this.state.rootHash() as string;

        /* Resolve promise, return success */
        transaction.resolve(root);
        transaction.addOutput(root);
        return true;
    }

    async softWithdrawal(transaction: SoftWithdrawTransaction): Promise<boolean> {
        const { accountIndex, value } = transaction;
        const fromAccount = await this.state.getAccount(accountIndex) as AccountType;

        /* Verification */
        if (!fromAccount) {
            transaction.reject("Account does not exist.");
            return false;
        }
        const errorMessage = transaction.checkValid(fromAccount) as string;
        if (errorMessage) {
            transaction.reject(errorMessage);
            return false;
        }

        /* Update caller account */
        fromAccount.nonce += 1;
        fromAccount.balance -= value;

        /* Update state */
        await this.state.updateAccount(accountIndex, fromAccount);
        const root = await this.state.rootHash() as string;

        /* Resolve promise, return success */
        transaction.resolve(root);
        transaction.addOutput(root);
        return true;
    }

    async softChangeSigner(transaction: SoftChangeSignerTransaction): Promise<boolean> {
        const { accountIndex, modificationCategory, signingAddress } = transaction;
        const fromAccount = await this.state.getAccount(accountIndex) as AccountType;
        /* Verification */
        if (!fromAccount) {
            transaction.reject("Account does not exist.");
            return false;
        }
        const errorMessage = transaction.checkValid(fromAccount) as string;
        if (errorMessage) {
            transaction.reject(errorMessage);
            return false;
        }

        /* Update caller account */
        fromAccount.nonce += 1;
        if (modificationCategory == 0) fromAccount.addSigner(signingAddress);
        else fromAccount.removeSigner(signingAddress);

        /* Update state */
        await this.state.updateAccount(accountIndex, fromAccount);
        const root = await this.state.rootHash() as string;

        /* Resolve promise, return success */
        transaction.resolve(root);
        transaction.addOutput(root);
        return true;
    }

    async softCreate(transaction: SoftCreateTransaction): Promise<boolean> {
        const { accountIndex, accountAddress, initialSigningKey, value } = transaction;
        const fromAccount = await this.state.getAccount(accountIndex) as AccountType;
        /* Verification */
        if (!fromAccount) {
            transaction.reject("Account does not exist.");
            return false;
        }
        const errorMessage = transaction.checkValid(fromAccount) as string;
        if (errorMessage) {
            transaction.reject(errorMessage);
            return false;
        }

        /* Update caller account */
        fromAccount.nonce += 1;
        fromAccount.balance -= value;
        await this.state.updateAccount(accountIndex, fromAccount);

        /* Create receiver */
        const account = new Account({
            address: accountAddress,
            nonce: 0,
            balance: value,
            signers: [initialSigningKey]
        }) as AccountType;
        const index = await this.state.putAccount(account) as number;

        const root = await this.state.rootHash() as string;

        /* Resolve promise, return success */
        transaction.resolve(root);
        transaction.addOutput(root);
        return true;
    }
}

export default StateMachine;
