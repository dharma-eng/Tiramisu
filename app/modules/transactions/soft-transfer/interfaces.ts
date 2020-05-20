import { ECDSASignature } from 'ethereumjs-util'

export type SoftTransferData<SigType = string> = {
  accountIndex: number;
  toAccountIndex: number;
  nonce: number;
  value: number;
  signature?: SigType;
  intermediateStateRoot?: string;
}

export type SoftTransferInput = SoftTransferData<string | ECDSASignature> & {
  privateKey?: Buffer;
}