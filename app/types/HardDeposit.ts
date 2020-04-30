import {HardDepositTransaction} from "./TransactionInterfaces";
const { toBuf, toHex, toInt } = require("../lib/to");

interface HardDepositArguments {
    accountIndex: number,
    hardTransactionIndex: number,
    value: number
}

export class HardDeposit implements HardDepositTransaction {
    prefix: 1;
    accountIndex: number;
    hardTransactionIndex: number;
    value: number;
    intermediateStateRoot: string;

    get bytesWithoutPrefix(): number {
        return 48;
    }

    constructor(args: HardDepositArguments) {
        const { accountIndex, hardTransactionIndex, value } = args;
        this.accountIndex = toInt(accountIndex);
        this.hardTransactionIndex = toInt(hardTransactionIndex);
        this.value = toInt(value);
        this.prefix = 1;
    }

    addOutput(intermediateStateRoot: string): void {
        this.intermediateStateRoot = toHex(intermediateStateRoot);
    }

    encode(prefix: boolean = false): Buffer {
        const txIndex = toBuf(this.hardTransactionIndex, 5) as Buffer;
        const acctIndex = toBuf(this.accountIndex, 4) as Buffer;
        const value = toBuf(this.value, 7) as Buffer;
        const root = toBuf(this.intermediateStateRoot, 32) as Buffer;
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
}

export default HardDeposit;
