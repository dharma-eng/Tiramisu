import {HardTransaction} from "../interfaces";
import { HardDepositData } from "./interfaces";
import {toBuf, toHex, toInt, sliceBuffer} from "../../../lib";

export { HardDepositData };

export interface HardDeposit extends HardTransaction, HardDepositData {
    prefix: 1;
    accountIndex: number;
}

export class HardDeposit {
    prefix: 1 = 1;

    get bytesWithoutPrefix(): number {
        return 48;
    }

    constructor(args: HardDepositData) {
        Object.assign(this, args);
    }

    addOutput(intermediateStateRoot: string): void {
        this.intermediateStateRoot = toHex(intermediateStateRoot);
    }

    encode(prefix: boolean = false): Buffer {
        const txIndex = toBuf(this.hardTransactionIndex, 5);
        const acctIndex = toBuf(this.accountIndex, 4);
        const value = toBuf(this.value, 7);
        const root = toBuf(this.intermediateStateRoot, 32);
        return Buffer.concat([
            prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
            txIndex,
            acctIndex,
            value,
            root
        ]);
    }

    static decode(buf: Buffer): HardDeposit {
        const hardTransactionIndex = toInt(sliceBuffer(buf, 0, 5));
        const accountIndex = toInt(sliceBuffer(buf, 5, 4));
        const value = toInt(sliceBuffer(buf, 9, 7));
        const intermediateStateRoot = toHex(sliceBuffer(buf, 16, 32));
        return new HardDeposit({
            hardTransactionIndex,
            accountIndex,
            value,
            intermediateStateRoot,
        });
    }

    static fromCreate({ hardTransactionIndex, value }, accountIndex: number): HardDeposit {
        return new HardDeposit({ accountIndex, hardTransactionIndex, value });
    }

    toJSON = (): HardDepositData => this;
}

export default HardDeposit;
