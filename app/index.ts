import setupServer from "./setupServer";
import setupStateMachine from "./setupStateMachine";
import { NODE_ENV } from "./env";

if (NODE_ENV === "develop") {
  setupServer();
}

export let stateMachine = setupStateMachine();
export * from './types';
export * from './state';
export * from './lib';
export {default as Blockchain} from './Blockchain';



