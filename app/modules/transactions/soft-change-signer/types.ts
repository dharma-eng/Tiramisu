import {
  GraphQLBoolean,
  GraphQLError,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString
} from "graphql";
import SoftChangeSigner from "./index";
import { AccountType } from "../../account/types";

export const SoftChangeSignerType = new GraphQLObjectType({
  name: "softChangeSigner",
  description: "Soft Change Signer Type",
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
    messageHash: {
      type: GraphQLString
    },
    signature: {
      type: GraphQLString
    },
    intermediateStateRoot: {
      type: GraphQLString
    },
    errors: {
      type: GraphQLList(GraphQLString)
    },
    success: {
      type: GraphQLBoolean
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

