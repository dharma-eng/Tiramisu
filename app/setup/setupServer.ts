import express from "express";
import { ApolloServer } from "apollo-server-express";
import schema from "../graphql/schema";

const PORT = 5000;
const GRAPHQL_ENDPOINT = "/";

function setupServer() {
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
}

export default setupServer;

