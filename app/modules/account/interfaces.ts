export interface AccountType {
  address: string;
  nonce: number;
  balance: number;
  signers: string[];
  hasSufficientBalance(value: number): boolean;
  checkNonce(nonce: number): boolean;
  hasSigner(address: string): boolean;
  encode(): Buffer;
  addSigner(address: string): void;
  removeSigner(address: string): void;
}

export interface AccountArguments {
  address: string;
  nonce: number;
  balance: number;
  signers: string[];
}
