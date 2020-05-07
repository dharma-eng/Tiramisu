import { GraphQLString } from "graphql";
import { AccountType } from "./types";
import { getAccountResolver } from "./resolvers";

export const getAccount = {
  type: AccountType,
  args: {
    address: {
      name: "address",
      type: GraphQLString,
    },
  },
  resolve: getAccountResolver,
};


