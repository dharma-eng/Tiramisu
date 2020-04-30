import { State, StateMachine } from "./state";

async function setupStateMachine() {
  const state = await State.create();
  return new StateMachine(state);
}

export default setupStateMachine;
