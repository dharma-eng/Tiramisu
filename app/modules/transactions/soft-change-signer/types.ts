import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString
} from "graphql";
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

export const GetUnsignedSoftChangeSignerInput = {
  accountAddress: {
    type: GraphQLString
  },
  signingAddress: {
    type: GraphQLString
  },
  modificationCategory: {
    type: GraphQLInt
  }
};

export const SubmitSoftChangeSignerInput = {
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
};
