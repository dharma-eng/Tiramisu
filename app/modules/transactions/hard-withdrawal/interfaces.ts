// export interface HardWithdrawArguments {
//   accountIndex: number;
//   hardTransactionIndex: number;
//   callerAddress: string;
//   value: number;
// }

export type HardWithdrawData = {
  hardTransactionIndex: number;
  accountIndex?: number;
  callerAddress: string;
  value: number;
  intermediateStateRoot?: string;
}