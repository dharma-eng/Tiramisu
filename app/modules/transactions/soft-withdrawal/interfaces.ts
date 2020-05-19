import { ECDSASignature } from 'ethereumjs-util'

export type SoftWithdrawalData<SigType = string> = {
  nonce: number;
  accountIndex: number;
  withdrawalAddress: string;
  value: number;
  signature?: SigType;
  intermediateStateRoot?: string;
}

<<<<<<< HEAD
export type SoftWithdrawalInput = SoftWithdrawalData<string | ECDSASignature> & {
=======
export type SoftWithdrawalInput = SoftWithdrawalData & {
>>>>>>> 77cabed4401f3a833b560171afbd18260261ee48
  privateKey?: Buffer;
}