import { State, StateMachine } from "./state";

export * from './types';
export * from './state';
export * from './lib';
export {default as Blockchain} from './Blockchain';
import setupServer from "./setupServer";

setupServer();

export let stateMachine = setupStateMachine();

async function setupStateMachine() {
  const state = await State.create();
  return new StateMachine(state);
}


