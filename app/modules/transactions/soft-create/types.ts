import { GraphQLBoolean, GraphQLFloat, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from "graphql";
import { AccountType } from "../../account/types";

export const SoftCreateType = new GraphQLObjectType({
  name: "softCreate",
  description: "Soft Create Type",
  fields: () => ({
    account: {
      type: AccountType
    },
    toAccount: {
      type: AccountType
    },
    toAccountIndex: {
      type: GraphQLInt
    },
    toAccountAddress: {
      type: GraphQLString
    },
    initialSigningKey: {
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

export const GetUnsignedSoftCreateInput = {
  accountAddress: {
    type: GraphQLString
  },
  toAccountAddress: {
    type: GraphQLString
  },
  initialSigningKey: {
    type: GraphQLString
  },
  value: {
    type: GraphQLFloat
  }
};

export const SubmitSoftCreateInput = {
  accountAddress: {
    type: GraphQLString
  },
  toAccountAddress: {
    type: GraphQLString
  },
  toAccountIndex: {
    type: GraphQLInt
  },
  initialSigningKey: {
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
