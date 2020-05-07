import { AccountType } from "./types";
import { GraphQLFloat, GraphQLString } from "graphql";
import { putAccountResolver } from "./resolvers";

//TODO: delete (should't be able to put account without executing transaction)
export const putAccountMutation = {
  type: AccountType,
  args: {
    address: {
      name: "address",
      type: GraphQLString,
    },
    initialSigningKey: {
      name: "initialSigningKey",
      type: GraphQLString,
    },
    balance: {
      name: "balance",
      type: GraphQLFloat,
    }
  },
  resolve: putAccountResolver,
};
