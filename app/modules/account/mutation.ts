import { AccountType, PutAccountInput } from "./types";
import { putAccountResolver } from "./resolvers";

//TODO: delete (should't be able to put account without executing transaction)
export const putAccountMutation = {
  type: AccountType,
  args: PutAccountInput,
  resolve: putAccountResolver,
};
