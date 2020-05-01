import { GraphQLObjectType } from "graphql";
import {test} from "../../modules/prueba/query";
import {getAccount} from "../../modules/account/query";

const queries = new GraphQLObjectType({
  name: "query",
  description: "API Queries [Read]",
  fields: () => ({
    test,
    getAccount
  }),
});

export default queries;
