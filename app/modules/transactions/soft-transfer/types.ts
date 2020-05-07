import { GraphQLInputObjectType, GraphQLObjectType } from "graphql";
import SoftTransfer from "./index";

export const SoftTransferType = new GraphQLObjectType({
  name: "softTransfer",
  description: "Soft Transfer Type",
  isTypeOf: account => account instanceof SoftTransfer,
  fields: () => ({
    //TODO: define fields
  }),
});

export const SubmitSoftTransferInput = new GraphQLInputObjectType({
  name: 'submitSoftTransferInput',
  fields: () => ({
    //TODO: define fields
  })
});

export const GetUnsignedSoftTransferInput = new GraphQLInputObjectType({
  name: 'getUnsignedSoftTransferInput',
  fields: () => ({
    //TODO: define fields
  })
});

