import { SoftCreateType, SubmitSoftCreateInput } from "./types";
import { submitSoftCreateResolver } from "./resolvers";

export const submitSoftCreate = {
  type: SoftCreateType,
  args: SubmitSoftCreateInput,
  resolve: submitSoftCreateResolver,
};
