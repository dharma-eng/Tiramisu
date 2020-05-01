import { GraphQLSchema } from "graphql";
import types from "./types";
import queries from "./queries";
import mutations from "./mutations";

const schema = new GraphQLSchema({
  types,
  query: queries,
  mutation: mutations,
});

export default schema;
