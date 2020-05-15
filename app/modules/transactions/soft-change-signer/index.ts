import {
    ecrecover,
    keccak256,
    ecsign,
    pubToAddress,
    fromRpcSig,
    toRpcSig,
    ECDSASignature
} from 'ethereumjs-util';
import {toBuf, toHex, toInt, sliceBuffer} from "../../../lib";
import {SoftTransaction} from "../interfaces";
import {Account} from "../../account";
import { SoftChangeSignerData, SoftChangeSignerInput } from './interfaces';

export { SoftChangeSignerData };

export interface SoftChangeSigner extends SoftTransaction, SoftChangeSignerData {
    prefix: 7;
    signature: string;
}

export class SoftChangeSigner {
    prefix: 7 = 7;

    get bytesWithoutPrefix(): number {
        return 125;
    }

    constructor(args: SoftChangeSignerInput) {
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
        const nonce = toBuf(this.nonce, 3) as Buffer;
        const fromIndex = toBuf(this.accountIndex, 4) as Buffer;
        const signingAddress = toBuf(this.signingAddress, 20) as Buffer;
        const modificationCategory = toBuf(this.modificationCategory, 1) as Buffer;
        const sig = toBuf(this.signature, 65) as Buffer;
        const root = toBuf(this.intermediateStateRoot, 32) as Buffer;
        return Buffer.concat([
            prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
            nonce,
            fromIndex,
            signingAddress,
            modificationCategory,
            sig,
            root
        ]);
    }

    static decode(buf: Buffer): SoftChangeSigner {
        const nonce = toInt(sliceBuffer(buf, 0, 3));
        const accountIndex = toInt(sliceBuffer(buf, 3, 4));
        const signingAddress = toHex(sliceBuffer(buf, 7, 20));
        const modificationCategory = toInt(sliceBuffer(buf, 27, 1))
        const signature = toHex(sliceBuffer(buf, 28, 65));
        const intermediateStateRoot = toHex(sliceBuffer(buf, 93, 32));
        return new SoftChangeSigner({
            nonce,
            accountIndex,
            signingAddress,
            modificationCategory,
            signature,
            intermediateStateRoot,
        });
    }

    toMessageHash(): Buffer {
        const fromIndex = toBuf(this.accountIndex, 4) as Buffer;
        const nonce = toBuf(this.nonce, 3) as Buffer;
        const signingAddress = toBuf(this.signingAddress, 20) as Buffer;
        const modificationCategory = toBuf(this.modificationCategory, 1) as Buffer;
        const msg = Buffer.concat([
            nonce,
            fromIndex,
            signingAddress,
            modificationCategory
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
            console.log(err);
            return null;
        }
    }

    checkValid(account: Account, signed: boolean = true): string {
        if (signed) {
            const signer = this.getSignerAddress();
            if (!(signer && account.hasSigner(signer))) return 'Invalid signature.';
        }
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

    toJSON = (): SoftChangeSignerData => this;
}

export default SoftChangeSigner;
