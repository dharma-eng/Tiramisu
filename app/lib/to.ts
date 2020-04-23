import { BigNumber } from 'sparse-merkle-tree';
import { toBuffer, setLength, bufferToHex, bufferToInt } from 'ethereumjs-utils';

export type BufferLike = string | number | Buffer | BigNumber;

export const toInt = (value: BufferLike): number => {
  if (typeof value == 'number') return value;
  if (typeof value == 'string') {
    if (value.slice(0, 2) == '0x') return parseInt(value, 16);
    return +value;
  }
  if (Buffer.isBuffer(value)) return bufferToInt(value);
  if (BigNumber.isBigNumber(value)) return value.toNumber();
  throw new Error('Did not recognize type.');
}

export const toHex = (value: BufferLike): string => {
  if (typeof value == 'number') return value.toString(16);
  if (typeof value == 'string') {
    if (value.slice(0, 2) == '0x') return value;
    return (+value).toString(16);
  }
  if (Buffer.isBuffer(value)) return bufferToHex(value);
  if (BigNumber.isBigNumber(value)) return value.toString('hex');
  throw new Error('Did not recognize type.');
}

export const toBuf = (value: BufferLike, length?: number): Buffer => {
  const buf = toBuffer(value);
  return (length) ? setLength(buf, length) : buf;
}

export const toNonPrefixed = (str: string) => {
  if (str.slice(0, 2) == '0x') return str.slice(2);
  return str;
}