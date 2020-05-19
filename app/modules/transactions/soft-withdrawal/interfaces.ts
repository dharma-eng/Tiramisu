import { ECDSASignature } from 'ethereumjs-util'

export type SoftWithdrawalData = {
  nonce: number;
  accountIndex: number;
  withdrawalAddress: string;
  value: number;
  signature?: string;
  intermediateStateRoot?: string;
}

export type SoftWithdrawalInput = SoftWithdrawalData & {
  privateKey?: Buffer;
  signature?: string | ECDSASignature;
}