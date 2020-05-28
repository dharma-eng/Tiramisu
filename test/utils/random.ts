import crypto = require("crypto");
import { privateToAddress } from 'ethereumjs-util';
import { toHex, toInt } from '../../app';

export function randomHexString(size) {
  const bytes = crypto.randomBytes(size);
  return toHex(bytes);
}

export function randomHexBuffer(size) {
  const bytes = randomHexString(size);
  return Buffer.from(bytes.slice(2), "hex");
}

export const randomAccount = () => {
  let privateKey = randomHexBuffer(32);
  let address = toHex(privateToAddress(privateKey));
  return { privateKey, address };
};

export const randomInt = (bytes) => {
  return toInt(randomHexBuffer(bytes));
}

export const randomFromArray = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
