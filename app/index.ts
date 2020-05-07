import {setupServer, NODE_ENV} from "./setup";
import DharmaL2Core from "./l2-core";

if (NODE_ENV === "develop") {
  setupServer();
}

//TODO: properly setup L2 core object that can be used throughout the app
export const L2CorePromise = DharmaL2Core.create({
  peg: {},
  from: "0x0",
  web3: {}
});
export * from "./setup";
export * from './modules';
export * from './lib';



