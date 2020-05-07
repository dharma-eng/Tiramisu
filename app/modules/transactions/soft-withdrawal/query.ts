import { GetUnsignedSoftWithdrawalInput, SoftWithdrawalType } from "./types";
import { getUnsignedSoftWithdrawalResolver } from "./resolvers";

export const getUnsignedSoftWithdrawal = {
  type: SoftWithdrawalType,
  args: GetUnsignedSoftWithdrawalInput,
  resolve: getUnsignedSoftWithdrawalResolver,
};
