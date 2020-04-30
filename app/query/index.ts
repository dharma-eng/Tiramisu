import { GraphQLObjectType } from "graphql";
import {test} from "./test";

const query = new GraphQLObjectType({
  name: "query",
  description: "API Queries [Read]",
  fields: () => ({
    test
  }),
});

export default query;
