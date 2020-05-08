import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString
} from "graphql";
import SoftWithdrawal from "./index";
import { AccountType } from "../../account/types";

export const SoftWithdrawalType = new GraphQLObjectType({
  name: "softWithdrawal",
  description: "Soft Withdrawal Type",
  isTypeOf: account => account instanceof SoftWithdrawal,
  fields: () => ({
    account: {
      type: AccountType
    },
    withdrawalAddress: {
      type: GraphQLString
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

export const GetUnsignedSoftWithdrawalInput = {
  accountAddress: {
    type: GraphQLString
  },
  withdrawalAddress: {
    type: GraphQLString
  },
  value: {
    type: GraphQLFloat
  }
};

export const SubmitSoftWithdrawalInput = {
  accountAddress: {
    type: GraphQLString
  },
  withdrawalAddress: {
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
