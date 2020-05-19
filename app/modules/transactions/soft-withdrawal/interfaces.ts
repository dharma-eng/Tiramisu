import { ECDSASignature } from 'ethereumjs-util'

export type SoftWithdrawalData<SigType = string> = {
  nonce: number;
  accountIndex: number;
  withdrawalAddress: string;
  value: number;
  signature?: SigType;
  intermediateStateRoot?: string;
}

export type SoftWithdrawalInput = SoftWithdrawalData<string | ECDSASignature> & {
  privateKey?: Buffer;
}