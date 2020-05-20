import { BigNumber } from 'sparse-merkle-tree';
import { toBuffer, setLengthLeft, bufferToHex, bufferToInt } from 'ethereumjs-util';

export type BufferLike = string | number | Buffer | BigNumber;
export const isHex = (str: string): boolean => Boolean(/[xabcdef]/g.exec(str));

export const toBn = (value: BufferLike): BigNumber => {
  if (BigNumber.isBigNumber(value)) return value as BigNumber;
  if (typeof value == 'number') return new BigNumber(value);
  if (typeof value == 'string') return new BigNumber(value, isHex(value) ? 'hex' : undefined);
  if (Buffer.isBuffer(value)) return new BigNumber(value);
}

export const toInt = (value: BufferLike): number => {
  if (typeof value == 'number') return value;
  if (typeof value == 'string') {
    if (isHex(value)) return parseInt(value, 16);
    return +value;
  }
  if (Buffer.isBuffer(value)) return bufferToInt(value);
  if (BigNumber.isBigNumber(value)) return value.toNumber();
  return bufferToInt(value.toBuffer());
}

export const toHex = (value: BufferLike): string => {
  if (typeof value == 'number') return toPrefixed(value.toString(16));
  if (typeof value == 'string') {
    if (isHex(value)) return toPrefixed(value);
    return toPrefixed((+value).toString(16));
  }
  if (Buffer.isBuffer(value)) return bufferToHex(value);
  if (BigNumber.isBigNumber(value)) return toPrefixed(value.toString('hex'));
  throw new Error(`Did not recognize input type: ${value}.`);
}

export const toBuf = (value: BufferLike, length?: number): Buffer => {
  const buf = toBuffer(typeof value == 'string' ? toHex(value) : value);
  return (length) ? setLengthLeft(buf, length) : buf;
}

export const toNonPrefixed = (str: string) => {
  if (str.slice(0, 2) == '0x') return str.slice(2);
  return str;
}

export const toPrefixed = (str: string): string => {
  if (str.slice(0, 2) == '0x') return str;
  return `0x${str}`;
}

export const sliceBuffer = (buf: Buffer, index: number, length?: number): Buffer => {
  const len = length || buf.byteLength - index;
  const copy = Buffer.alloc(len);
  buf.copy(copy, 0, index, index + len);
  return copy;
}