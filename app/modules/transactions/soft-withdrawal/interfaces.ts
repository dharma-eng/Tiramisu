export interface SoftWithdrawalArguments {
  fromAccountIndex: number;
  withdrawalAddress: string;
  nonce: number;
  value: number;
  signature?: string;
  privateKey?: Buffer;
}
