import {HardWithdrawTransaction} from "../interfaces"
import {AccountType} from "../../account/interfaces";
import { HardWithdrawArguments } from "./interfaces";
import {toBuf, toHex, toInt} from "../../../lib";

export class HardWithdraw implements HardWithdrawTransaction {
    prefix: 2;
    accountIndex: number;
    hardTransactionIndex: number;
    callerAddress: string;
    value: number;
    intermediateStateRoot: string;

    get bytesWithoutPrefix(): number {
        return 68;
    }

    constructor(args: HardWithdrawArguments) {
        const { accountIndex, hardTransactionIndex, callerAddress, value } = args;
        this.accountIndex = toInt(accountIndex);
        this.hardTransactionIndex = toInt(hardTransactionIndex);
        this.callerAddress = toHex(callerAddress);
        this.value = toInt(value);
        this.prefix = 2;
    }

    addOutput(intermediateStateRoot: string): void {
        this.intermediateStateRoot = toHex(intermediateStateRoot);
    }

    encode(prefix: boolean = false): Buffer {
        const txIndex = toBuf(this.hardTransactionIndex, 5) as Buffer;
        const acctIndex = toBuf(this.accountIndex, 4) as Buffer;
        const withdrawalAddress = toBuf(this.callerAddress, 20) as Buffer;
        const value = toBuf(this.value, 7) as Buffer;
        const root = toBuf(this.intermediateStateRoot, 32) as Buffer;
        return Buffer.concat([
            prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
            txIndex,
            acctIndex,
            withdrawalAddress,
            value,
            root
        ]);
    }

    checkValid(account: AccountType): string {
        if (!(account.address == this.callerAddress))
            return `Caller not approved for withdrawal.`;
        if (!account.hasSufficientBalance(this.value))
            return `Account has insufficient balance for withdrawal.`;
    }

    static fromLayer1(hardTransactionIndex: number, buf: Buffer): HardWithdraw {
        let accountIndex = toInt(toHex(buf.slice(1, 5))) as number;
        let callerAddress = toHex(buf.slice(5, 25)) as string;
        let value = toInt(toHex(buf.slice(25))) as number;
        return new HardWithdraw({
            accountIndex,
            hardTransactionIndex,
            callerAddress,
            value
        });
    }
}

export default HardWithdraw;
