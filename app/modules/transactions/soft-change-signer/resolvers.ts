import { L2CorePromise, SoftChangeSigner, toHex } from "../../../index";
import TransactionQueue from "../../transactions-queue"

function validateInputs(accountIndex: number, signingAddress: string, modificationCategory: number) {
  const errors = [];

  if (accountIndex === null) {
    errors.push("Account does not exist for address; cannot modify signer");
  }

  if (![0, 1].includes(modificationCategory)) {
    errors.push("Modification category must be 0 or 1.");
  }

  //TODO: validate signing address is valid ETH address

  return errors;
}

export async function getUnsignedSoftChangeSignerResolver(
  parentValue,
  { accountAddress, signingAddress, modificationCategory },
  auth
) {
  const L2Core = await L2CorePromise;
  const state = await L2Core.getLatestState();

  const accountIndex = await state.getAccountIndexByAddress(accountAddress);

  const errors = validateInputs(accountIndex, signingAddress, modificationCategory);

  if (errors.length > 0) {
    return {
      errors
    };
  }

  const account = await state.getAccount(accountIndex);

  const softChangeSigner = new SoftChangeSigner({
    accountIndex,
    nonce: account.nonce,
    signingAddress,
    modificationCategory,
    signature: "unsigned"
  });

  const error = softChangeSigner.checkValid(account, false);

  if (error) {
    errors.push(error);
  }

  const messageHash = toHex(softChangeSigner.toMessageHash());

  return {
    account,
    ...softChangeSigner,
    messageHash,
    errors
  };
}

export async function submitSoftChangeSignerResolver(
  parentValue,
  { accountAddress, signingAddress, modificationCategory, nonce, signature },
  auth
) {
  const L2Core = await L2CorePromise;
  const state = await L2Core.getLatestState();

  const accountIndex = await state.getAccountIndexByAddress(accountAddress);

  const errors = validateInputs(accountIndex, signingAddress, modificationCategory);

  if (errors.length > 0) {
    return {
      errors
    };
  }

  const account = await state.getAccount(accountIndex);

  const softChangeSigner = new SoftChangeSigner({
    accountIndex,
    nonce,
    signingAddress,
    modificationCategory,
    signature
  });

  const error = softChangeSigner.checkValid(account, true);

  let success;
  if (error) {
    errors.push(error);
    success = false;
  } else {
    //TODO: this will return once the transaction has been executed. should we await here?
    await TransactionQueue.queueTransaction(softChangeSigner);
    success = true;
  }

  return {
    account,
    ...softChangeSigner,
    errors,
    success
  };
}
