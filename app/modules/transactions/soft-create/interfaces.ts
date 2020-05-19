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

export type SoftCreateInput = SoftCreateData<string | ECDSASignature> & {
  privateKey?: Buffer;
}