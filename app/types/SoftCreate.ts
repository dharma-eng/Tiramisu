import {SoftCreateTransaction} from "./TransactionInterfaces";
import {AccountType} from "./Account";

const { toBuf, toHex, toInt } = require("../lib/to");
const {
    ecrecover,
    keccak256,
    ecsign,
    pubToAddress,
    fromRpcSig,
    toRpcSig
} = require("ethereumjs-utils");

interface SoftCreateArguments {
    fromAccountIndex: number;
    toAccountIndex: number;
    nonce: number;
    value: number;
    contractAddress: string;
    signingAddress: string;
    signature?: string;
    privateKey?: Buffer;
}

class SoftCreate implements SoftCreateTransaction {
    accountIndex: number;
    toAccountIndex: number;
    nonce: number;
    value: number;
    accountAddress: string;
    initialSigningKey: string;
    signature: string;
    intermediateStateRoot: string;
    resolve: () => void;
    reject: (errorMessage: string) => void;

    get prefix(): number {
        return 5;
    }

    constructor(args: SoftCreateArguments) {
        const {
            fromAccountIndex,
            toAccountIndex,
            nonce,
            value,
            contractAddress,
            signingAddress,
            signature,
            privateKey
        } = args;
        this.accountIndex = toInt(fromAccountIndex);
        this.toAccountIndex = toInt(toAccountIndex);
        this.nonce = toInt(nonce);
        this.value = toInt(value);
        this.accountAddress = toHex(contractAddress);
        this.initialSigningKey = toHex(signingAddress);

        let sig = privateKey ? this.sign(privateKey) : signature;
        if (typeof sig == "object") this.signature = toRpcSig(sig.v, sig.r, sig.s);
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
        const toIndex = toBuf(this.toAccountIndex, 4) as Buffer;
        const nonce = toBuf(this.nonce, 3) as Buffer;
        const value = toBuf(this.value, 7) as Buffer;
        const contractAddress = toBuf(this.accountAddress, 20) as Buffer;
        const signingAddress = toBuf(this.initialSigningKey, 20) as Buffer;
        const sig = toBuf(this.signature, 65) as Buffer;
        const root = toBuf(this.intermediateStateRoot, 32) as Buffer;
        return Buffer.concat([
            prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
            fromIndex,
            toIndex,
            nonce,
            value,
            contractAddress,
            signingAddress,
            sig,
            root
        ]);
    }

    toMessageHash(): string {
        const fromIndex = toBuf(this.accountIndex, 4) as Buffer;
        const toIndex = toBuf(this.toAccountIndex, 4) as Buffer;
        const nonce = toBuf(this.nonce, 3) as Buffer;
        const value = toBuf(this.value, 7) as Buffer;
        const msg = Buffer.concat([fromIndex, toIndex, nonce, value]);
        return keccak256(msg);
    }

    sign(privateKey: Buffer): string {
        const msgHash = this.toMessageHash() as string;
        return ecsign(msgHash, privateKey);
    }

    getSignerAddress(): string {
        const msgHash = this.toMessageHash() as string;
        const { v, r, s } = fromRpcSig(this.signature);
        try {
            const publicKey = ecrecover(msgHash, v, r, s) as string;
            return toHex(pubToAddress(publicKey, true));
        } catch (err) {
            console.log(err);
            return null;
        }
    }

    checkValid(account: AccountType): string {
        const signer = this.getSignerAddress() as string;
        if (!(signer && account.hasSigner(signer))) return "Invalid signature.";
        if (!account.checkNonce(this.nonce))
            return `Invalid nonce. Expected ${account.nonce}`;
        if (!account.hasSufficientBalance(this.value))
            return `Insufficient balance. Account has ${account.balance}.`;
    }
}

module.exports = SoftCreate;
