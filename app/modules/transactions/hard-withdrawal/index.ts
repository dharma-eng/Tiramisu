import {HardTransaction} from "../interfaces"
import {Account} from "../../account";
import { HardWithdrawData } from "./interfaces";
import {toBuf, toHex, toInt, sliceBuffer} from "../../../lib";

export { HardWithdrawData };

export interface HardWithdraw extends HardTransaction, HardWithdrawData {
    prefix: 2;
}

export class HardWithdraw {
    prefix: 2 = 2;

    get bytesWithoutPrefix(): number {
        return 68;
    }

    constructor(args: HardWithdrawData) {
        Object.assign(this, args);
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

    static decode(buf: Buffer): HardWithdraw {
        const hardTransactionIndex = toInt(sliceBuffer(buf, 0, 5));
        const accountIndex = toInt(sliceBuffer(buf, 5, 4));
        const callerAddress = toHex(sliceBuffer(buf, 9, 20));
        const value = toInt(sliceBuffer(buf, 29, 7));
        const intermediateStateRoot = toHex(sliceBuffer(buf, 36, 32));
        return new HardWithdraw({
            hardTransactionIndex,
            accountIndex,
            callerAddress,
            value,
            intermediateStateRoot,
        });
    }

    checkValid(account: Account): string {
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

    toJSON = (): HardWithdrawData => this;
}

export default HardWithdraw;
