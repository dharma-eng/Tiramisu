import { State, StateMachine } from "../modules/state";

async function setupStateMachine() {
  const state = await State.create();
  return new StateMachine(state);
}

export default setupStateMachine();
