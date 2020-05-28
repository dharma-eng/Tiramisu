import {
    HardAddSigner,
    HardCreate,
    HardDeposit,
    HardWithdraw,
    SoftChangeSigner,
    SoftCreate,
    SoftTransfer,
    SoftWithdrawal,
    Transactions,
    Transaction
} from "../transactions";
import { Account } from "../account";
import { State } from "./State";
import Block from "../block";
import { decodeHardTransactions, sortTransactions } from "../../lib";

export interface StateMachine {
    state: State;
}

export type ExecuteBlockOptions = {
    blockNumber: number;
    hardTransactionsIndex: number;
    version: number;
    encodedHardTransactions: string[];
    softTransactions: Transaction[];
}

export class StateMachine {
    constructor(state: State) {
        this.state = state;
    }

    async executeBlock(opts: ExecuteBlockOptions): Promise<Block> {
        const {
            blockNumber,
            hardTransactionsIndex,
            version,
            encodedHardTransactions,
            softTransactions
        } = opts;
        
        const hardTransactions = await decodeHardTransactions(
            this.state,
            hardTransactionsIndex,
            encodedHardTransactions
        );

        const transactions = sortTransactions([
            ...hardTransactions,
            ...softTransactions
        ]) as Transactions;

        await this.execute(transactions);
        
        return new Block({
            version,
            blockNumber: blockNumber + 1,
            stateSize: this.state.size,
            stateRoot: await this.state.rootHash(),
            hardTransactionsIndex,
            transactions
        });
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

    async executeSingle(transaction: Transaction) {
        switch(transaction.prefix) {
            case 0: return this.hardCreate(transaction)
            case 1: return this.hardDeposit(transaction)
            case 2: return this.hardWithdraw(transaction)
            case 3: return this.hardAddSigner(transaction)
            case 4: return this.softWithdrawal(transaction)
            case 5: return this.softCreate(transaction)
            case 6: return this.softTransfer(transaction)
            case 7: return this.softChangeSigner(transaction)
        }
    }

    async hardCreate(transaction: HardCreate): Promise<boolean> {
        const { accountAddress, initialSigningKey, value } = transaction;
        const account = new Account({
            address: accountAddress,
            nonce: 0,
            balance: value,
            signers: [initialSigningKey]
        }) as Account;
        const index = await this.state.putAccount(account) as number;
        const stateRoot = await this.state.rootHash() as string;
        transaction.addOutput(stateRoot, index);
        return true;
    }

    async hardDeposit(transaction: HardDeposit): Promise<boolean> {
        const { accountIndex, value } = transaction;
        const account = await this.state.getAccount(accountIndex) as Account;
        account.balance += value;
        await this.state.updateAccount(accountIndex, account);
        const stateRoot = await this.state.rootHash() as string;
        transaction.addOutput(stateRoot);
        return true;
    }

    async hardWithdraw(transaction: HardWithdraw): Promise<boolean> {
        const { accountIndex, value } = transaction;
        const account = await this.state.getAccount(accountIndex) as Account;
        if (!account || transaction.checkValid(account)) {
            transaction.addOutput(await this.state.rootHash());
            return false;
        }
        account.balance -= value;
        await this.state.updateAccount(accountIndex, account);
        const stateRoot = await this.state.rootHash() as string;
        transaction.addOutput(stateRoot);
        return true;
    }

    async hardAddSigner(transaction: HardAddSigner): Promise<boolean> {
        const { accountIndex, signingAddress } = transaction;
        const account = await this.state.getAccount(accountIndex) as Account;

        if (!account || transaction.checkValid(account)) {
            transaction.addOutput(await this.state.rootHash());
            return false;
        }

        account.addSigner(signingAddress);
        await this.state.updateAccount(accountIndex, account);
        const stateRoot = await this.state.rootHash() as string;
        transaction.addOutput(stateRoot);
        return true;
    }

    async softTransfer(transaction: SoftTransfer): Promise<boolean> {
        const { accountIndex, toAccountIndex, value } = transaction;
        const fromAccount = await this.state.getAccount(accountIndex) as Account;
        const toAccount = await this.state.getAccount(toAccountIndex) as Account;

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

    async softWithdrawal(transaction: SoftWithdrawal): Promise<boolean> {
        const { accountIndex, value } = transaction;
        const fromAccount = await this.state.getAccount(accountIndex) as Account;

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

    async softChangeSigner(transaction: SoftChangeSigner): Promise<boolean> {
        const { accountIndex, modificationCategory, signingAddress } = transaction;
        const fromAccount = await this.state.getAccount(accountIndex) as Account;
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

    async softCreate(transaction: SoftCreate): Promise<boolean> {
        const { accountIndex, accountAddress, initialSigningKey, value } = transaction;
        const fromAccount = await this.state.getAccount(accountIndex) as Account;
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
        }) as Account;
        const index = await this.state.putAccount(account) as number;

        const root = await this.state.rootHash() as string;

        /* Resolve promise, return success */
        transaction.resolve(root);
        transaction.addOutput(root, index);
        return true;
    }
}

export default StateMachine;
