import { L2CorePromise, SoftCreate, toHex, UNSIGNED } from "../../../index";
import TransactionQueue from "../../transactions-queue";

//TODO generalize to getUnsignedTransferTransaction -- node will tell you if need to create the account or  not
export async function getUnsignedSoftCreateResolver(
  parentValue,
  { accountAddress, toAccountAddress, initialSigningKey, value },
  auth
) {
  //TODO: update pulling in L2Core
  const L2Core = await L2CorePromise;
  const state = await L2Core.getLatestState();

  const accountIndex = await state.getAccountIndexByAddress(accountAddress);

  const errors = validateInputs(accountIndex, initialSigningKey);

  if (errors.length > 0) {
    return {
      errors
    };
  }

  const account = await state.getAccount(accountIndex);

  //TODO: this will be incorrect if there are multiple create transactions in one block -- need to fix
  const toAccountIndex = state.size;

  const softCreate = new SoftCreate({
    accountIndex,
    nonce: account.nonce,
    toAccountIndex,
    value,
    accountAddress: toAccountAddress,
    initialSigningKey,
    signature: UNSIGNED
  });

  const error = softCreate.checkValid(account, false);

  if (error) {
    errors.push(error);
  }

  const messageHash = toHex(softCreate.toMessageHash());

  return {
    account,
    ...softCreate,
    messageHash,
    errors
  };
}

export async function submitSoftCreateResolver(
  parentValue,
  { accountAddress, nonce, value, toAccountIndex, toAccountAddress, initialSigningKey, signature },
  auth
) {
  //TODO: update pulling in L2Core
  const L2Core = await L2CorePromise;
  const state = await L2Core.getLatestState();

  const accountIndex = await state.getAccountIndexByAddress(accountAddress);

  const errors = validateInputs(accountIndex, initialSigningKey);

  if (errors.length > 0) {
    return {
      errors
    };
  }

  const account = await state.getAccount(accountIndex);

  const softCreate = new SoftCreate({
    accountIndex,
    nonce,
    toAccountIndex,
    value,
    accountAddress: toAccountAddress,
    initialSigningKey,
    signature
  });

  const error = softCreate.checkValid(account, true);

  let success;
  if (error) {
    errors.push(error);
    success = false;
  } else {
    //TODO: this will return once the transaction has been executed. should we await here?
    await TransactionQueue.queueTransaction(softCreate);
    success = true;
  }

  return {
    account,
    ...softCreate,
    errors,
    success
  };
}

function validateInputs(accountIndex: number, initialSigningKey: string) {
  const errors = [];

  if (accountIndex === null) {
    errors.push("Account does not exist for address; cannot transfer funds from account");
  }

  //TODO: validate initialSigningKey is valid ETH address

  return errors;
}
