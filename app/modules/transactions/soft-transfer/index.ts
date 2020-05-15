import { ecrecover, keccak256, ecsign, pubToAddress, fromRpcSig, toRpcSig, ECDSASignature } from 'ethereumjs-util';
import {toBuf, toHex, toInt, sliceBuffer} from "../../../lib";
import {SoftTransaction} from "../interfaces";
import {Account} from "../../account";
import { SoftTransferData, SoftTransferInput } from "./interfaces";

export { SoftTransferData };

export interface SoftTransfer extends SoftTransaction, SoftTransferData {
    prefix: 6;
    signature: string;
}

export class SoftTransfer {
    prefix: 6 = 6;

    get bytesWithoutPrefix():number {
        return 115;
    }

    constructor(args: SoftTransferInput) {
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
        const sig = toBuf(this.signature, 65) as Buffer;
        const root = toBuf(this.intermediateStateRoot, 32) as Buffer;
        return Buffer.concat([
            prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
            nonce,
            fromIndex,
            toIndex,
            value,
            sig,
            root
        ]);
    }

    static decode(buf: Buffer): SoftTransfer {
        const nonce = toInt(sliceBuffer(buf, 0, 3));
        const accountIndex = toInt(sliceBuffer(buf, 3, 4));
        const toAccountIndex = toInt(sliceBuffer(buf, 7, 4));
        const value = toInt(sliceBuffer(buf, 11, 7));
        const signature = toHex(sliceBuffer(buf, 18, 65));
        const intermediateStateRoot = toHex(sliceBuffer(buf, 83, 32));
        return new SoftTransfer({
            nonce,
            accountIndex,
            toAccountIndex,
            value,
            signature,
            intermediateStateRoot
        });
    }

    toMessageHash(): Buffer {
        const fromIndex = toBuf(this.accountIndex, 4) as Buffer;
        const toIndex = toBuf(this.toAccountIndex, 4) as Buffer;
        const nonce = toBuf(this.nonce, 3) as Buffer;
        const value = toBuf(this.value, 7) as Buffer;
        const msg = Buffer.concat([
            nonce,
            fromIndex,
            toIndex,
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

    checkValid(account: Account, signed: boolean = true): string {
        if (signed) {
            const signer = this.getSignerAddress() as string;
            if (!(signer && account.hasSigner(signer))) return 'Invalid signature.';
        }
        if (!account.checkNonce(this.nonce)) return `Invalid nonce. Expected ${account.nonce}`;
        if (!account.hasSufficientBalance(this.value)) return `Insufficient balance. Account has ${account.balance}.`;
    }

    toJSON = (): SoftTransferData => this;
}

export default SoftTransfer;
