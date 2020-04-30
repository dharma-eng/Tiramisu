import { GraphQLString } from "graphql";

export const test = {
  type: GraphQLString,
  resolve: () => "Hello world!",
};
