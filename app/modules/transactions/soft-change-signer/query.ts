import { getUnsignedSoftChangeSignerResolver } from "./resolvers";
import { GetUnsignedSoftChangeSignerInput, SoftChangeSignerType } from "./types";

export const getUnsignedSoftChangeSigner = {
  type: SoftChangeSignerType,
  args: GetUnsignedSoftChangeSignerInput,
  resolve: getUnsignedSoftChangeSignerResolver,
};

