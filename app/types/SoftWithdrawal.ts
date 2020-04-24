import {SoftWithdrawTransaction} from "./TransactionInterfaces";
import {AccountType} from "./Account";
import { toBuf, toHex, toInt } from '../lib/to';
import { ecrecover, keccak256, ecsign, pubToAddress, fromRpcSig, toRpcSig, ECDSASignature } from 'ethereumjs-util';

export interface SoftWithdrawalArguments {
    fromAccountIndex: number;
    withdrawalAddress: string;
    nonce: number;
    value: number;
    signature?: string;
    privateKey?: Buffer;
}

export class SoftWithdrawal implements SoftWithdrawTransaction {
    accountIndex: number;
    withdrawalAddress: string;
    nonce: number;
    value: number;
    signature: string;
    intermediateStateRoot: string;
    resolve: () => void;
    reject: (errorMessage: string) => void;

    get prefix(): number {
        return 4;
    }

    constructor({
        fromAccountIndex,
        withdrawalAddress,
        nonce,
        value,
        signature,
        privateKey
    }: SoftWithdrawalArguments) {
        this.accountIndex = toInt(fromAccountIndex);
        this.withdrawalAddress = toHex(withdrawalAddress);
        this.nonce = toInt(nonce);
        this.value = toInt(value);

        let sig = (privateKey) ? this.sign(privateKey) : signature

        if (typeof sig == 'object') this.signature = toRpcSig(sig.v, sig.r, sig.s);
        else this.signature = toHex(sig);
    }

    assignResolvers(resolve: () => void, reject: (errorMessage: string) => void): void {
        this.resolve = resolve;
        this.reject = reject;
    }

    addOutput(intermediateStateRoot: string): void {
        this.intermediateStateRoot = toHex(intermediateStateRoot);
    }

    encode(prefix: boolean = false): Buffer {
        const fromIndex = toBuf(this.accountIndex, 4) as Buffer;
        const withdrawalAddress = toBuf(this.withdrawalAddress, 20) as Buffer;
        const nonce = toBuf(this.nonce, 3) as Buffer;
        const value = toBuf(this.value, 7) as Buffer;
        const sig = toBuf(this.signature, 65) as Buffer;
        const root = toBuf(this.intermediateStateRoot) as Buffer;
        return Buffer.concat([
            prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
            nonce,
            fromIndex,
            withdrawalAddress,
            value,
            sig,
            root
        ]);
    }

    toMessageHash(): Buffer {
        const fromIndex = toBuf(this.accountIndex, 4) as Buffer;
        const withdrawalAddress = toBuf(this.withdrawalAddress, 20) as Buffer;
        const nonce = toBuf(this.nonce, 3) as Buffer;
        const value = toBuf(this.value, 7) as Buffer;
        const msg = Buffer.concat([
            nonce,
            fromIndex,
            withdrawalAddress,
            value
        ]);
        return keccak256(msg);
    }

    sign(privateKey: Buffer): ECDSASignature {
        const msgHash = this.toMessageHash();
        return ecsign(msgHash, privateKey);
    }

    getSignerAddress(): string {
        const msgHash = this.toMessageHash();
        const { v, r, s } = fromRpcSig(this.signature);
        try {
            const publicKey = ecrecover(msgHash, v, r, s);
            return toHex(pubToAddress(publicKey, true));
        } catch(err) {
            console.log(err)
            return null;
        }
    }

    /* Returns either null or an error string */
    checkValid(account: AccountType): string {
        const signer = this.getSignerAddress() as string;
        if (!(signer && account.hasSigner(signer))) return 'Invalid signature.';
        if (!account.checkNonce(this.nonce)) return `Invalid nonce. Expected ${account.nonce}`;
        if (!account.hasSufficientBalance(this.value)) return `Insufficient balance. Account has ${account.balance}.`;
    }
}

export default SoftWithdrawal;
