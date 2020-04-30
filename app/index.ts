import setupServer from "./setupServer";
import { NODE_ENV } from "./env";

if (NODE_ENV === "develop") {
  setupServer();
}

export {default as stateMachine} from "./setupStateMachine";
export * from './types';
export * from './state';
export * from './lib';
export {default as Blockchain} from './Blockchain';



