import { GraphQLInputObjectType, GraphQLObjectType } from "graphql";
import SoftWithdrawal from "./index";

export const SoftWithdrawalType = new GraphQLObjectType({
  name: "softWithdrawal",
  description: "Soft Withdrawal Type",
  isTypeOf: account => account instanceof SoftWithdrawal,
  fields: () => ({
    //TODO: define fields
  }),
});

export const SubmitSoftWithdrawalInput = new GraphQLInputObjectType({
  name: 'submitSoftWithdrawalInput',
  fields: () => ({
    //TODO: define fields
  })
});

export const GetUnsignedSoftWithdrawalInput = new GraphQLInputObjectType({
  name: 'getUnsignedSoftWithdrawalInput',
  fields: () => ({
    //TODO: define fields
  })
});
