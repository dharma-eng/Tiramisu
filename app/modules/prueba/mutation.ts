import { GraphQLString } from "graphql";

/**
 * NOTE: this was done to test setting up the GraphQL schema
 * The whole prueba folder will be deleted once we have at least one legitimate query and mutation
 */
export const testPrint = {
  type: GraphQLString,
  args: {
    stringToPrint: {
      name: "stringToPrint",
      type: GraphQLString,
    }
  },
  resolve: (parentValue, { stringToPrint }, auth) => {
    const string = `PRINTING STRING: ${stringToPrint}`;
    console.log(string);
    return string;
  }
};
