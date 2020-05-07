import { GraphQLInputObjectType, GraphQLObjectType, GraphQLString } from "graphql";
import SoftChangeSigner from "./index";

export const SoftChangeSignerType = new GraphQLObjectType({
  name: "softChangeSigner",
  description: "Soft Change Signer Type",
  isTypeOf: account => account instanceof SoftChangeSigner,
  fields: () => ({
    //TODO: define fields
  }),
});

export const SubmitSoftChangeSignerInput = new GraphQLInputObjectType({
  name: 'submitSoftChangeSignerInput',
  fields: () => ({
    //TODO: define fields
  })
});

export const GetUnsignedSoftChangeSignerInput = new GraphQLInputObjectType({
  name: 'getUnsignedSoftChangeSignerInput',
  fields: () => ({
    //TODO: define fields
  })
});

