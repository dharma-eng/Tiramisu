import { GraphQLObjectType } from "graphql";
import {test} from "./test";
import {getAccount} from "./account";

const query = new GraphQLObjectType({
  name: "query",
  description: "API Queries [Read]",
  fields: () => ({
    test,
    getAccount
  }),
});

export default query;
