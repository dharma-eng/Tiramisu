import { getUnsignedSoftTransferResolver } from "./resolvers";
import { GetUnsignedSoftTransferInput, SoftTransferType } from "./types";

export const getUnsignedSoftTransfer = {
  type: SoftTransferType,
  args: GetUnsignedSoftTransferInput,
  resolve: getUnsignedSoftTransferResolver,
};
