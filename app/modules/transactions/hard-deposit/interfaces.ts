// export interface HardDepositArguments {
//   accountIndex: number,
//   hardTransactionIndex: number,
//   value: number
// }

export type HardDepositData = {
  accountIndex: number;
  hardTransactionIndex: number;
  value: number;
  intermediateStateRoot?: string;
}
