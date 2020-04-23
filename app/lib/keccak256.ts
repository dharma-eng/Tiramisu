import createKeccakHash from "keccak";

export function keccak256(a: string | Buffer): Buffer {
  return createKeccakHash(`keccak256`)
    .update(a)
    .digest();
};

export default keccak256;