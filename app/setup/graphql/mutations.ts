import { GraphQLObjectType } from "graphql";
import {testPrint} from "../../modules/prueba/mutation";

const mutations = new GraphQLObjectType({
  name: "mutations",
  description: "API Mutations [Create, Update, Delete]",
  fields: () => ({
    testPrint
  }),
});

export default mutations;
