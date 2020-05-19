import { ECDSASignature } from 'ethereumjs-util'

export type SoftTransferData = {
  accountIndex: number;
  toAccountIndex: number;
  nonce: number;
  value: number;
  signature?: string;
  intermediateStateRoot?: string;
}

export type SoftTransferInput = SoftTransferData & {
  privateKey?: Buffer;
  signature?: string | ECDSASignature;
}