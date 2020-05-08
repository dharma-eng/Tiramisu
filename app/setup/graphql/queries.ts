import { GraphQLObjectType } from "graphql";
import * as account from "../../modules/account/query";
import * as softChangeSigner from "../../modules/transactions/soft-change-signer/query";
import * as softCreate from "../../modules/transactions/soft-create/query";
import * as softTransfer from "../../modules/transactions/soft-transfer/query";
import * as softWithdrawal from "../../modules/transactions/soft-withdrawal/query";

const queries = new GraphQLObjectType({
  name: "query",
  description: "API Queries [Read]",
  fields: () => ({
    ...account,
    ...softChangeSigner,
    ...softCreate,
    ...softTransfer,
    ...softWithdrawal
  }),
});

export default queries;
