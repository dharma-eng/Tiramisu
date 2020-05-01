import { toBuf, toHex, toInt } from "../../../lib";
import {HardAddSignerTransaction} from "../interfaces";
import { HardAddSignerArguments } from "./interfaces";
import {AccountType} from "../../account/interfaces";

export class HardAddSigner implements HardAddSignerTransaction {
    prefix: 3;
    accountIndex: number;
    hardTransactionIndex: number;
    callerAddress: string;
    signingAddress: string;
    intermediateStateRoot: string;

    get bytesWithoutPrefix(): number {
        return 61;
    }

    constructor(args: HardAddSignerArguments) {
        const {
            accountIndex,
            hardTransactionIndex,
            callerAddress,
            signingAddress
        } = args;
        this.accountIndex = toInt(accountIndex);
        this.hardTransactionIndex = toInt(hardTransactionIndex);
        this.callerAddress = toHex(callerAddress);
        this.signingAddress = toHex(signingAddress);
        this.prefix = 3;
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
        let accountIndex = toInt(toHex(buf.slice(1, 5))) as number;
        let callerAddress = toHex(buf.slice(5, 25)) as string;
        let signingAddress = toHex(buf.slice(25)) as string;

        return new HardAddSigner({
            hardTransactionIndex,
            accountIndex,
            callerAddress,
            signingAddress
        });
    }
}

export default HardAddSigner;
