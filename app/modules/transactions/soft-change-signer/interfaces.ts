import { ECDSASignature } from 'ethereumjs-util';

export type SoftChangeSignerData = {
  nonce: number;
  accountIndex: number;
  signingAddress: string;
  modificationCategory: number;
  signature?: string | ECDSASignature;
  intermediateStateRoot?: string;
}

export type SoftChangeSignerInput = SoftChangeSignerData & {
  privateKey?: Buffer;
}