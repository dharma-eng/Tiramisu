import { toBuf, toHex, toInt } from "../../../lib";
import { HardTransaction } from "../interfaces";
import { HardAddSignerData } from "./interfaces";
import { AccountType } from "../../account/interfaces";

export { HardAddSignerData };

export interface HardAddSigner extends HardTransaction, HardAddSignerData {
    prefix: 3;
    accountIndex: number;
}

export class HardAddSigner {
    prefix: 3 = 3;

    get bytesWithoutPrefix(): number {
        return 61;
    }

    constructor(args: HardAddSignerData) {
        Object.assign(this, args);
    }

    addOutput(intermediateStateRoot: string): void{
        this.intermediateStateRoot = toHex(intermediateStateRoot);
    }

    encode(prefix: boolean = false): Buffer {
        const txIndex = toBuf(this.hardTransactionIndex, 5) as Buffer;
        const acctIndex = toBuf(this.accountIndex, 4) as Buffer;
        const signingAddress = toBuf(this.signingAddress, 20) as Buffer;
        const root = toBuf(this.intermediateStateRoot, 32) as Buffer;
        return Buffer.concat([
            prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
            txIndex,
            acctIndex,
            signingAddress,
            root
        ]);
    }

    checkValid(account: AccountType): string {
        if (account.hasSigner(this.signingAddress))
            return `Invalid signing address. Account already has signer ${
                this.signingAddress
                }`;
        if (!(account.address == this.callerAddress)) return `Caller not approved.`;
        if (account.signers.length == 10) return `Account signer array full.`;
    }

    static fromLayer1(hardTransactionIndex: number, buf: Buffer): HardAddSigner {
        let accountIndex = toInt(toHex(buf.slice(1, 5)));
        let callerAddress = toHex(buf.slice(5, 25));
        let signingAddress = toHex(buf.slice(25));

        return new HardAddSigner({
            hardTransactionIndex,
            accountIndex,
            callerAddress,
            signingAddress
        });
    }

    toJSON = (): HardAddSignerData => this;
}

export default HardAddSigner;
