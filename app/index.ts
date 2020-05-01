import {setupServer, NODE_ENV} from "./setup";

if (NODE_ENV === "develop") {
  setupServer();
}

export * from "./setup";
export * from './modules';
export * from './lib';



