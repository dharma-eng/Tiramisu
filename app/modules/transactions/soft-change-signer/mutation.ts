import { SoftChangeSignerType, SubmitSoftChangeSignerInput } from "./types";
import { submitSoftChangeSignerResolver } from "./resolvers";

export const submitSoftChangeSigner = {
  type: SoftChangeSignerType,
  args: SubmitSoftChangeSignerInput,
  resolve: submitSoftChangeSignerResolver,
};
