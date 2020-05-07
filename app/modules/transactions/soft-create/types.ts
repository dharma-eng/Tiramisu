import { GraphQLInputObjectType, GraphQLObjectType, GraphQLString } from "graphql";
import SoftCreate from "./index";

export const SoftCreateType = new GraphQLObjectType({
  name: "softCreate",
  description: "Soft Create Type",
  isTypeOf: account => account instanceof SoftCreate,
  fields: () => ({
    //TODO: define fields
  }),
});

export const SubmitSoftCreateInput = new GraphQLInputObjectType({
  name: 'submitSoftCreateInput',
  fields: () => ({
    //TODO: define fields
  })
});

export const GetUnsignedSoftCreateInput = new GraphQLInputObjectType({
  name: 'getUnsignedSoftCreateInput',
  fields: () => ({
    //TODO: define fields
  })
});

