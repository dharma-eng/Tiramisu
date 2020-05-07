import { GraphQLInputObjectType, GraphQLInt, GraphQLObjectType, GraphQLString } from "graphql";
import SoftChangeSigner from "./index";
import { AccountType } from "../../account/types";

export const SoftChangeSignerType = new GraphQLObjectType({
  name: "softChangeSigner",
  description: "Soft Change Signer Type",
  isTypeOf: account => account instanceof SoftChangeSigner,
  fields: () => ({
    account: {
      type: AccountType
    },
    signingAddress: {
      type: GraphQLString
    },
    modificationCategory: {
      type: GraphQLInt
    },
    nonce: {
      type: GraphQLInt
    },
    signature: {
      type: GraphQLString
    },
    intermediateStateRoot: {
      type: GraphQLString
    }
  }),
});

export const SubmitSoftChangeSignerInput = new GraphQLInputObjectType({
  name: 'submitSoftChangeSignerInput',
  fields: () => ({
    accountAddress: {
      type: GraphQLString
    },
    signingAddress: {
      type: GraphQLString
    },
    modificationCategory: {
      type: GraphQLInt
    },
    nonce: {
      type: GraphQLInt
    },
    signature: {
      type: GraphQLString
    },
  })
});

export const GetUnsignedSoftChangeSignerInput = new GraphQLInputObjectType({
  name: 'getUnsignedSoftChangeSignerInput',
  fields: () => ({
    accountAddress: {
      type: GraphQLString
    },
    signingAddress: {
      type: GraphQLString
    },
    modificationCategory: {
      type: GraphQLInt
    }
  })
});

