import { ECDSASignature } from 'ethereumjs-util';

export type SoftCreateData = {
  accountIndex: number;
  toAccountIndex: number;
  nonce: number;
  value: number;
  accountAddress: string;
  initialSigningKey: string;
  signature?: string | ECDSASignature;
  intermediateStateRoot?: string;
}

export interface SoftCreateInput extends SoftCreateData {
  privateKey?: Buffer;
}