export type HardAddSignerData = {
  hardTransactionIndex: number;
  accountIndex: number;
  callerAddress: string;
  signingAddress: string;
  intermediateStateRoot?: string;
}