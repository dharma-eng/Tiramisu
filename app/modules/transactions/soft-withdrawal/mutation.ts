import { SoftWithdrawalType, SubmitSoftWithdrawalInput } from "./types";
import { submitSoftWithdrawalResolver } from "./resolvers";

export const submitSoftWithdrawal = {
  type: SoftWithdrawalType,
  args: SubmitSoftWithdrawalInput,
  resolve: submitSoftWithdrawalResolver,
};
