import {HardTransaction} from "../interfaces";
import { HardDepositData } from "./interfaces";
import {toBuf, toHex} from "../../../lib";

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

    static fromCreate({ hardTransactionIndex, value }, accountIndex: number): HardDeposit {
        return new HardDeposit({ accountIndex, hardTransactionIndex, value });
    }

    toJSON = (): HardDepositData => this;
}

export default HardDeposit;
