import { ECDSASignature } from 'ethereumjs-util';

export type SoftChangeSignerData = {
  nonce: number;
  accountIndex: number;
  signingAddress: string;
  modificationCategory: number;
  signature?: string;
  intermediateStateRoot?: string;
}

export interface SoftChangeSignerInput extends SoftChangeSignerData {
  privateKey?: Buffer;
  signature?: string | ECDSASignature;
}