import { GraphQLObjectType } from "graphql";
import {testPrint} from "./test";

const mutation = new GraphQLObjectType({
  name: "mutations",
  description: "API Mutations [Create, Update, Delete]",
  fields: () => ({
    testPrint
  }),
});

export default mutation;
