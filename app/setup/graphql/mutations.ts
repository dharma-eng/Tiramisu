import { GraphQLObjectType } from "graphql";
import * as account from "../../modules/account/mutation";
import * as softChangeSigner from "../../modules/transactions/soft-change-signer/mutation";
import * as softCreate from "../../modules/transactions/soft-create/mutation";

const mutations = new GraphQLObjectType({
  name: "mutations",
  description: "API Mutations [Create, Update, Delete]",
  fields: () => ({
    ...account,
    ...softChangeSigner,
    ...softCreate
  }),
});

export default mutations;
