import { GetAccountInput, AccountType } from "./types";
import { getAccountResolver } from "./resolvers";

export const getAccount = {
  type: AccountType,
  args: GetAccountInput,
  resolve: getAccountResolver,
};


