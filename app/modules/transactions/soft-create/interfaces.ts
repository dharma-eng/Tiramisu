export interface SoftCreateArguments {
  fromAccountIndex: number;
  toAccountIndex: number;
  nonce: number;
  value: number;
  contractAddress: string;
  signingAddress: string;
  signature?: string;
  privateKey?: Buffer;
}
