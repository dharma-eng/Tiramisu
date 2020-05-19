import { ECDSASignature } from 'ethereumjs-util'

export type SoftTransferData<SigType = string> = {
  accountIndex: number;
  toAccountIndex: number;
  nonce: number;
  value: number;
  signature?: SigType;
  intermediateStateRoot?: string;
}

<<<<<<< HEAD
export type SoftTransferInput = SoftTransferData<string | ECDSASignature> & {
=======
export type SoftTransferInput = SoftTransferData & {
>>>>>>> 77cabed4401f3a833b560171afbd18260261ee48
  privateKey?: Buffer;
}