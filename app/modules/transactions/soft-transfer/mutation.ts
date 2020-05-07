import { SoftTransferType, SubmitSoftTransferInput } from "./types";
import { submitSoftTransferResolver } from "./resolvers";

export const submitSoftTransfer = {
  type: SoftTransferType,
  args: SubmitSoftTransferInput,
  resolve: submitSoftTransferResolver,
};
