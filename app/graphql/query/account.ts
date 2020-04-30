import { AccountType } from "../type/accountType";
import { GraphQLString } from "graphql";
import { stateMachine } from "../../index";

export const getAccount = {
  type: AccountType,
  args: {
    address: {
      name: "address",
      type: GraphQLString,
    },
  },
  resolve: async (parentValue, { address }, auth) => {
    const machine = await stateMachine;

    const index = await machine.state.getAccountIndexByAddress(address);

    if (index || index === 0) {
      return machine.state.getAccount(index);
    }
  },
};


