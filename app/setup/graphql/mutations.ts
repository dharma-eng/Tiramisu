import { GraphQLObjectType } from "graphql";
import * as account from "../../modules/account/mutation";

const mutations = new GraphQLObjectType({
  name: "mutations",
  description: "API Mutations [Create, Update, Delete]",
  fields: () => ({
    ...account,
  }),
});

export default mutations;
