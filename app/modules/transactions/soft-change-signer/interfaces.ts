import { ECDSASignature } from 'ethereumjs-util';

export type SoftChangeSignerData<SigType = string> = {
  nonce: number;
  accountIndex: number;
  signingAddress: string;
  modificationCategory: number;
  signature?: SigType;
  intermediateStateRoot?: string;
}

<<<<<<< HEAD
export type SoftChangeSignerInput = SoftChangeSignerData<string | ECDSASignature> & {
=======
export type SoftChangeSignerInput = SoftChangeSignerData & {
>>>>>>> 77cabed4401f3a833b560171afbd18260261ee48
  privateKey?: Buffer;
}