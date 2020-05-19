import { ECDSASignature } from 'ethereumjs-util';

export type SoftCreateData<SigType = string> = {
  accountIndex: number;
  toAccountIndex: number;
  nonce: number;
  value: number;
  accountAddress: string;
  initialSigningKey: string;
  signature?: SigType;
  intermediateStateRoot?: string;
}

<<<<<<< HEAD
export type SoftCreateInput = SoftCreateData<string | ECDSASignature> & {
=======
export type SoftCreateInput = SoftCreateData & {
>>>>>>> 77cabed4401f3a833b560171afbd18260261ee48
  privateKey?: Buffer;
}