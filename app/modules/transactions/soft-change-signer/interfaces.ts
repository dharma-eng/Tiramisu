import { ECDSASignature } from 'ethereumjs-util';

export type SoftChangeSignerData = {
  nonce: number;
  accountIndex: number;
  signingAddress: string;
  modificationCategory: number;
  signature?: string;
  intermediateStateRoot?: string;
}

export type SoftChangeSignerInput = SoftChangeSignerData & {
  privateKey?: Buffer;
  signature?: string | ECDSASignature;
}