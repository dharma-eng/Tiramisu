import { GetUnsignedSoftCreateInput, SoftCreateType } from "./types";
import { getUnsignedSoftCreateResolver } from "./resolvers";

export const getUnsignedSoftCreate = {
  type: SoftCreateType,
  args: GetUnsignedSoftCreateInput,
  resolve: getUnsignedSoftCreateResolver,
};

