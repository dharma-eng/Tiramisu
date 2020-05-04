import { ECDSASignature } from 'ethereumjs-util'

export type SoftTransferData = {
  accountIndex: number;
  toAccountIndex: number;
  nonce: number;
  value: number;
  signature?: string;
  intermediateStateRoot?: string;
}

export interface SoftTransferInput extends SoftTransferData {
  privateKey?: Buffer;
  signature?: string | ECDSASignature;
}