import { GraphQLSchema } from "graphql";
import types from "./type";
import query from "./query";
import mutation from "./mutation";

const schema = new GraphQLSchema({
  types,
  query,
  mutation,
});

export default schema;
