import { GraphQLObjectType } from "graphql";
import * as account from "../../modules/account/mutation";
import * as softChangeSigner from "../../modules/transactions/soft-change-signer/mutation";

const mutations = new GraphQLObjectType({
  name: "mutations",
  description: "API Mutations [Create, Update, Delete]",
  fields: () => ({
    ...account,
    ...softChangeSigner,
  }),
});

export default mutations;
