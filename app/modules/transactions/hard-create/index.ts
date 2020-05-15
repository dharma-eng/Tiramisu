import { CreateTransaction, HardTransaction } from "../interfaces";
import { HardCreateData } from "./interfaces";
import {toBuf, toHex, toInt, sliceBuffer} from "../../../lib";

export { HardCreateData };

export interface HardCreate extends HardTransaction, CreateTransaction, HardCreateData {
    prefix: 0;
}

export class HardCreate {
    prefix: 0 = 0;

    constructor(args: HardCreateData) {
        Object.assign(this, args);
    }

    addOutput(intermediateStateRoot: string, accountIndex: number): void {
        this.accountIndex = toInt(accountIndex);
        this.intermediateStateRoot = toHex(intermediateStateRoot);
    }

    encode(prefix: boolean = false): Buffer {
        const txIndex = toBuf(this.hardTransactionIndex, 5) as Buffer;
        const acctIndex = toBuf(this.accountIndex, 4) as Buffer;
        const value = toBuf(this.value, 7) as Buffer;
        const accountAddress = toBuf(this.accountAddress, 20) as Buffer;
        const initialSigningKey = toBuf(this.initialSigningKey, 20) as Buffer;
        const root = toBuf(this.intermediateStateRoot, 32) as Buffer;
        return Buffer.concat([
            prefix ? toBuf(this.prefix, 1) : Buffer.alloc(0),
            txIndex,
            acctIndex,
            value,
            accountAddress,
            initialSigningKey,
            root
        ]);
    }

    static decode(buf: Buffer): HardCreate {
        const hardTransactionIndex = toInt(sliceBuffer(buf, 0, 5));
        const accountIndex = toInt(sliceBuffer(buf, 5, 4));
        const value = toInt(sliceBuffer(buf, 9, 7));
        const accountAddress = toHex(sliceBuffer(buf, 16, 20))
        const initialSigningKey = toHex(sliceBuffer(buf, 36, 20));
        const intermediateStateRoot = toHex(sliceBuffer(buf, 56, 32));
        return new HardCreate({
            hardTransactionIndex,
            accountIndex,
            value,
            accountAddress,
            initialSigningKey,
            intermediateStateRoot,
        });
    }

    static fromLayer1(hardTransactionIndex: number, buf: Buffer): HardCreate {
        let accountAddress = toHex(buf.slice(1, 21)) as string;
        let initialSigningKey = toHex(buf.slice(21, 41)) as string;
        let value = toInt(toHex(buf.slice(41))) as number;
        return new HardCreate({
            hardTransactionIndex,
            accountIndex: undefined,
            accountAddress,
            initialSigningKey,
            value
        });
    }

    toJSON = (): HardCreateData => this;
}

export default HardCreate;
