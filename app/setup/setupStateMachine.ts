import { State, StateMachine } from "../modules/state";

/**
 * NOTE: This is a hack that will be deleted once we've setup persistent state
 */
async function setupStateMachine() {
  const state = await State.create();
  return new StateMachine(state);
}

export default setupStateMachine();
