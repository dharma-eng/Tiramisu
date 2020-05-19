import { ECDSASignature } from 'ethereumjs-util';

export type SoftChangeSignerData<SigType = string> = {
  nonce: number;
  accountIndex: number;
  signingAddress: string;
  modificationCategory: number;
  signature?: SigType;
  intermediateStateRoot?: string;
}

export type SoftChangeSignerInput = SoftChangeSignerData<string | ECDSASignature> & {
  privateKey?: Buffer;
}