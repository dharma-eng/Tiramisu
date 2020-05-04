import {
    ecrecover,
    keccak256,
    ecsign,
    pubToAddress,
    fromRpcSig,
    toRpcSig,
    ECDSASignature
} from 'ethereumjs-util'
import {toBuf, toHex} from "../../../lib";
import {SoftTransaction, CreateTransaction} from "../interfaces";
import {AccountType} from "../../account/interfaces";
import { SoftCreateData, SoftCreateInput } from "./interfaces";

export { SoftCreateData };

export interface SoftCreate extends SoftTransaction, CreateTransaction, SoftCreateData {
    prefix: 5;
    signature: string;
}

export class SoftCreate {
    prefix: 5 = 5;

    get bytesWithoutPrefix(): number {
        return 155;
    }

    constructor(args: SoftCreateInput) {
        const { privateKey, signature, ...rest } = args;
        Object.assign(this, rest);
        let sig = (privateKey) ? this.sign(privateKey) : signature
        this.signature = (typeof sig == 'object') ? toRpcSig(sig.v, sig.r, sig.s) : sig;
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
            nonce,
            fromIndex,
            toIndex,
            value,
            contractAddress,
            signingAddress,
            sig,
            root
        ]);
    }

    toMessageHash(): Buffer {
        const fromIndex = toBuf(this.accountIndex, 4) as Buffer;
        const toIndex = toBuf(this.toAccountIndex, 4) as Buffer;
        const nonce = toBuf(this.nonce, 3) as Buffer;
        const value = toBuf(this.value, 7) as Buffer;
        const msg = Buffer.concat([fromIndex, toIndex, nonce, value]);
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

    toJSON = (): SoftCreateData => this;
}

export default SoftCreate;
