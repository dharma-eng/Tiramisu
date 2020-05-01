import { ECDSASignature } from 'ethereumjs-util'

export interface SoftTransferArguments {
  fromAccountIndex: number;
  toAccountIndex: number;
  nonce: number;
  value: number;
  signature?: ECDSASignature | string;
  privateKey?: Buffer;
}
