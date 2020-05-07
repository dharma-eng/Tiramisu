import { GraphQLObjectType } from "graphql";
import * as account from "../../modules/account/query";
import * as softChangeSigner from "../../modules/transactions/soft-change-signer/query";
import * as softCreate from "../../modules/transactions/soft-create/query";

const queries = new GraphQLObjectType({
  name: "query",
  description: "API Queries [Read]",
  fields: () => ({
    ...account,
    ...softChangeSigner,
    ...softCreate,
  }),
});

export default queries;
