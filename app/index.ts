import {setupServer, NODE_ENV} from "./setup";
import TiramisuCore from "./l2-core";

if (NODE_ENV === "develop") {
  setupServer();
}

//TODO: properly setup Tiramisu core object that can be used throughout the app
export const TiramisuCorePromise = TiramisuCore.create({
  tiramisuContract: {},
  from: "0x0",
  web3: {}
});
export * from "./setup";
export * from './modules';
export * from './lib';
export * from "./constants";
