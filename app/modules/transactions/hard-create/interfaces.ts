export type HardCreateData = {
  hardTransactionIndex: number;
  accountIndex?: number;
  value: number;
  accountAddress: string;
  initialSigningKey: string;
  intermediateStateRoot?: string;
}