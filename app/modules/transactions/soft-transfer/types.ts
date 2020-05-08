import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt, GraphQLList,
  GraphQLObjectType,
  GraphQLString
} from "graphql";
import SoftTransfer from "./index";
import { AccountType } from "../../account/types";

export const SoftTransferType = new GraphQLObjectType({
  name: "softTransfer",
  description: "Soft Transfer Type",
  isTypeOf: account => account instanceof SoftTransfer,
  fields: () => ({
    account: {
      type: AccountType
    },
    toAccount: {
      type: AccountType
    },
    nonce: {
      type: GraphQLInt
    },
    value: {
      type: GraphQLFloat
    },
    signature: {
      type: GraphQLString
    },
    prefix: {
      type: GraphQLInt
    },
    intermediateStateRoot: {
      type: GraphQLString
    },
    messageHash: {
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

export const SubmitSoftTransferInput = {
  accountAddress: {
    type: GraphQLString
  },
  toAccountAddress: {
    type: GraphQLString
  },
  value: {
    type: GraphQLFloat
  }
};

export const GetUnsignedSoftTransferInput = {
  accountAddress: {
    type: GraphQLString
  },
  toAccountAddress: {
    type: GraphQLString
  },
  value: {
    type: GraphQLFloat
  },
  nonce: {
    type: GraphQLInt
  },
  signature: {
    type: GraphQLString
  }
};

