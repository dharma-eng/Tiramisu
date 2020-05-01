export interface SoftChangeSignerArguments {
  fromAccountIndex: number;
  nonce: number;
  signingAddress: string;
  modificationCategory: number;
  signature?: string;
  privateKey?: Buffer;
}
