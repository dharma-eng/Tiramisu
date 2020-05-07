import { GraphQLObjectType } from "graphql";
import * as account from "../../modules/account/query";

const queries = new GraphQLObjectType({
  name: "query",
  description: "API Queries [Read]",
  fields: () => ({
    ...account,
  }),
});

export default queries;
