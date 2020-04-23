import {HardCreateTransaction} from "./TransactionInterfaces";
const { toBuf, toHex, toInt } = require('../lib/to');

interface HardCreateArguments {
    hardTransactionIndex: number,
    contractAddress: string,
    signerAddress: string,
    value: number
}

export class HardCreate implements HardCreateTransaction {
    hardTransactionIndex: number;
    accountAddress: string;
    initialSigningKey: string;
    value: number;
    intermediateStateRoot: string;
    accountIndex: number;

    get prefix(): number {
        return 0;
    }

    constructor(args: HardCreateArguments) {
        const {
            hardTransactionIndex,
            contractAddress,
            signerAddress,
            value
        } = args;
        this.hardTransactionIndex = toInt(hardTransactionIndex);
        this.accountAddress = toHex(contractAddress);
        this.initialSigningKey = toHex(signerAddress);
        this.value = toInt(value);
    }

    addOutput(intermediateStateRoot: string, accountIndex: number): void {
        this.accountIndex = toInt(accountIndex);
        this.intermediateStateRoot = toHex(intermediateStateRoot);
    }

    encode(prefix: boolean = false): Buffer {
        const txIndex = toBuf(this.hardTransactionIndex, 5) as Buffer;
        const acctIndex = toBuf(this.accountIndex, 4) as Buffer;
        const value = toBuf(this.value, 7) as Buffer;
        const contractAddress = toBuf(this.accountAddress) as Buffer;
        const signerAddress = toBuf(this.initialSigningKey) as Buffer;
        const root = toBuf(this.intermediateStateRoot) as Buffer;
        return Buffer.concat([
            prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
            txIndex,
            acctIndex,
            value,
            contractAddress,
            signerAddress,
            root
        ]);
    }

    static fromLayer1(hardTransactionIndex: number, buf: Buffer): HardCreate {
        let contractAddress = toHex(buf.slice(1, 21)) as string;
        let signerAddress = toHex(buf.slice(21, 41)) as string;
        let value = toInt(toHex(buf.slice(41))) as number;
        return new HardCreate({
            hardTransactionIndex,
            contractAddress,
            signerAddress,
            value
        });
    }
}

export default HardCreate;
