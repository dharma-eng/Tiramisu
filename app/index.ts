import express from "express";
import { ApolloServer } from "apollo-server-express";
import { GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
const PORT = 5000;
const GRAPHQL_ENDPOINT = "/";

const test = {
  type: GraphQLString,
  resolve: () => "Hello world!",
};

const query = new GraphQLObjectType({
  name: "query",
  description: "API Queries [Read]",
  fields: () => ({
    test
  }),
});

const testPrint = {
  type: GraphQLString,
  args: {
    stringToPrint: {
      name: "stringToPrint",
      type: GraphQLString,
    }
  },
  resolve: (parentValue, { stringToPrint }, auth) => {
    console.log(`PRINTING STRING: ${stringToPrint}`);
  }
};

const mutation = new GraphQLObjectType({
  name: "mutations",
  description: "API Mutations [Create, Update, Delete]",
  fields: () => ({
    testPrint
  }),
});

const types = [];

const schema = new GraphQLSchema({
  types,
  query,
  mutation,
});

const server = express();

const context = ({ req }) => ({
  req,
});

const apolloServer = new ApolloServer({ schema, context });

apolloServer.applyMiddleware({
  app: server,
  path: GRAPHQL_ENDPOINT,
});

server.listen(PORT, error => {
  if (error) {
    console.error("ERROR - Unable to start server.");
  } else {
    console.log(
      `INFO - Server started on http://localhost:${PORT}`
    );
  }
});

export * from './types';
export * from './state';
export * from './lib';
export {default as Blockchain} from './Blockchain';

