import { ecrecover, keccak256, ecsign, pubToAddress, fromRpcSig, toRpcSig, ECDSASignature } from 'ethereumjs-util';
import {toBuf, toHex, toInt, sliceBuffer} from "../../../lib";
import {SoftTransaction} from "../interfaces";
import {Account} from "../../account";
import { SoftWithdrawalData, SoftWithdrawalInput } from "./interfaces";

export { SoftWithdrawalData };

export interface SoftWithdrawal extends SoftTransaction, SoftWithdrawalData {
    prefix: 4;
    signature: string;
}

export class SoftWithdrawal {
    prefix: 4 = 4;

    get bytesWithoutPrefix(): number {
        return 131;
    }

    constructor(args: SoftWithdrawalInput) {
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
        const withdrawalAddress = toBuf(this.withdrawalAddress, 20) as Buffer;
        const nonce = toBuf(this.nonce, 3) as Buffer;
        const value = toBuf(this.value, 7) as Buffer;
        const sig = toBuf(this.signature, 65) as Buffer;
        const root = toBuf(this.intermediateStateRoot, 32) as Buffer;
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

    static decode(buf: Buffer): SoftWithdrawal {
        const nonce = toInt(sliceBuffer(buf, 0, 3));
        const accountIndex = toInt(sliceBuffer(buf, 3, 4));
        const withdrawalAddress = toHex(sliceBuffer(buf, 7, 20));
        const value = toInt(sliceBuffer(buf, 27, 7));
        const signature = toHex(sliceBuffer(buf, 34, 65));
        const intermediateStateRoot = toHex(sliceBuffer(buf, 99, 32));
        return new SoftWithdrawal({
            nonce,
            accountIndex,
            withdrawalAddress,
            value,
            signature,
            intermediateStateRoot
        });
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
    checkValid(account: Account, signed: boolean = true): string {
        if (signed) {
            const signer = this.getSignerAddress() as string;
            if (!(signer && account.hasSigner(signer))) return 'Invalid signature.';
        }
        if (!account.checkNonce(this.nonce)) return `Invalid nonce. Expected ${account.nonce}`;
        if (!account.hasSufficientBalance(this.value)) return `Insufficient balance. Account has ${account.balance}.`;
    }

    toJSON = (): SoftWithdrawalData => this;
}

export default SoftWithdrawal;
