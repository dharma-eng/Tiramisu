import { GraphQLString } from "graphql";

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
