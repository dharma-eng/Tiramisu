import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLList,
  GraphQLInputObjectType
} from "graphql";
import {Account} from "./";

export const AccountType = new GraphQLObjectType({
  name: "account",
  description: "Account Type",
  isTypeOf: account => account instanceof Account,
  fields: () => ({
    address: {
      type: GraphQLString,
    },
    nonce: {
      type: GraphQLInt,
    },
    balance: {
      type: GraphQLFloat,
    },
    signers: {
      type: GraphQLList(GraphQLString),
    },
  }),
});


export const GetAccountInput = new GraphQLInputObjectType({
  name: 'getAccountInput',
  fields: () => ({
    address: {
      type: GraphQLString
    },
  })
});

export const PutAccountInput = new GraphQLInputObjectType({
  name: 'putAccountInput',
  fields: () => ({
    address: {
      type: GraphQLString,
    },
    initialSigningKey: {
      type: GraphQLString,
    },
    balance: {
      type: GraphQLFloat,
    }
  })
});


