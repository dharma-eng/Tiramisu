import {
    ecrecover,
    keccak256,
    ecsign,
    pubToAddress,
    fromRpcSig,
    toRpcSig,
    ECDSASignature
} from 'ethereumjs-util'
import {toBuf, toHex, toInt, sliceBuffer} from "../../../lib";
import {SoftTransaction, CreateTransaction} from "../interfaces";
import {Account} from "../../account";
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

    static decode(buf: Buffer): SoftCreate {
        const nonce = toInt(sliceBuffer(buf, 0, 3));
        const accountIndex = toInt(sliceBuffer(buf, 3, 4));
        const toAccountIndex = toInt(sliceBuffer(buf, 7, 4));
        const value = toInt(sliceBuffer(buf, 11, 7));
        const accountAddress = toHex(sliceBuffer(buf, 18, 20));
        const initialSigningKey = toHex(sliceBuffer(buf, 38, 20));
        const signature = toHex(sliceBuffer(buf, 58, 65));
        const intermediateStateRoot = toHex(sliceBuffer(buf, 123, 32));
        return new SoftCreate({
            nonce,
            accountIndex,
            toAccountIndex,
            value,
            accountAddress,
            initialSigningKey,
            signature,
            intermediateStateRoot
        });
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

    checkValid(account: Account): string {
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
