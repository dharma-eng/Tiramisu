import express from "express";
import { ApolloServer } from "apollo-server-express";
import schema from "./schema";

const PORT = 5000;
const GRAPHQL_ENDPOINT = "/";

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

