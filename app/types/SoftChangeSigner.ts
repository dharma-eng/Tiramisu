import {SoftChangeSignerTransaction} from "./TransactionInterfaces";
import {AccountType} from "./Account";
const { toBuf, toHex, toInt } = require('../lib/to');
const { ecrecover, keccak256, ecsign, pubToAddress, fromRpcSig, toRpcSig } = require('ethereumjs-utils')

interface SoftChangeSignerArguments {
    fromAccountIndex: number;
    nonce: number;
    signingAddress: string;
    modificationCategory: number;
    signature?: string;
    privateKey?: Buffer;
}

class SoftChangeSigner implements SoftChangeSignerTransaction {
    nonce: number;
    signingAddress: string;
    modificationCategory: number;
    signature: string;
    intermediateStateRoot: string;
    fromAccountIndex: number;
    accountIndex: number;
    resolve: () => void;
    reject: () => void;

    get prefix(): number {
        return 7;
    }

    constructor(args: SoftChangeSignerArguments) {
        const {
            fromAccountIndex,
            nonce,
            signingAddress,
            modificationCategory,
            signature,
            privateKey
        } = args;
        this.fromAccountIndex = toInt(fromAccountIndex);
        this.nonce = toInt(nonce);
        this.signingAddress = toHex(signingAddress);
        this.modificationCategory = toInt(modificationCategory);

        let sig = (privateKey) ? this.sign(privateKey) : signature

        if (typeof sig == 'object') this.signature = toRpcSig(sig.v, sig.r, sig.s);
        else this.signature = toHex(sig);
    }

    assignResolvers(resolve: () => void, reject: () => void): void {
        this.resolve = resolve;
        this.reject = reject;
    }

    addOutput(intermediateStateRoot: string): void {
        this.intermediateStateRoot = toHex(intermediateStateRoot);
    }

    encode(prefix: boolean = false): Buffer {
        const fromIndex = toBuf(this.fromAccountIndex, 4) as Buffer;
        const nonce = toBuf(this.nonce, 3) as Buffer;
        const signingAddress = toBuf(this.signingAddress, 20) as Buffer;
        const modificationCategory = toBuf(this.modificationCategory, 1) as Buffer;
        const sig = toBuf(this.signature, 65) as Buffer;
        const root = toBuf(this.intermediateStateRoot, 32) as Buffer;
        return Buffer.concat([
            prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
            fromIndex,
            nonce,
            signingAddress,
            modificationCategory,
            sig,
            root
        ]);
    }

    toMessageHash(): string {
        const fromIndex = toBuf(this.fromAccountIndex, 4) as Buffer;
        const nonce = toBuf(this.nonce, 3) as Buffer;
        const signingAddress = toBuf(this.signingAddress, 20) as Buffer;
        const modificationCategory = toBuf(this.modificationCategory, 1) as Buffer;
        const msg = Buffer.concat([
            fromIndex,
            nonce,
            signingAddress,
            modificationCategory
        ]);
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
        } catch(err) {
            console.log(err);
            return null;
        }
    }

    checkValid(account: AccountType): string {
        const signer = this.getSignerAddress();
        if (!(signer && account.hasSigner(signer))) return 'Invalid signature.';
        if (!account.checkNonce(this.nonce)) return `Invalid nonce. Expected ${account.nonce}`;
        if (this.modificationCategory == 0) {
            /* Add signer */
            if (account.hasSigner(this.signingAddress)) return `Invalid signing address. Account already has signer ${this.signingAddress}`;
            if (account.signers.length == 10) return `Account signer array full.`;
        } else {
            /* Remove signer */
            if (!account.hasSigner(this.signingAddress)) return `Invalid signing address. Account does not have signer ${this.signingAddress}`;
            if (account.signers.length == 1) return `Can not remove last signer from account.`
        }
    }
}

module.exports = SoftChangeSigner;
