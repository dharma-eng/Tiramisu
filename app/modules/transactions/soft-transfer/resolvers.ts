import { L2CorePromise, toHex, UNSIGNED } from "../../../index";
import SoftTransfer from "./";
import TransactionQueue from "../../transactions-queue";

export async function getUnsignedSoftTransferResolver(
  parentValue,
  { accountAddress, toAccountAddress, value },
  auth
) {
  //TODO: update pulling in L2Core
  const L2Core = await L2CorePromise;
  const state = await L2Core.getLatestState();

  const accountIndex = await state.getAccountIndexByAddress(accountAddress);
  const toAccountIndex = await state.getAccountIndexByAddress(toAccountAddress);

  const errors = validateInputs(accountIndex, toAccountIndex);

  if (errors.length > 0) {
    return {
      errors
    };
  }

  const account = await state.getAccount(accountIndex);
  const toAccount = await state.getAccount(toAccountIndex);

  const softTransfer = new SoftTransfer({
    accountIndex,
    toAccountIndex,
    nonce: account.nonce,
    value,
    signature: UNSIGNED
  });

  const error = softTransfer.checkValid(account, false);

  if (error) {
    errors.push(error);
  }

  const messageHash = toHex(softTransfer.toMessageHash());

  return {
    account,
    toAccount,
    ...softTransfer,
    messageHash,
    errors
  };
}

export async function submitSoftTransferResolver(
  parentValue,
  { accountAddress, toAccountAddress, value, nonce, signature },
  auth
) {
  //TODO: update pulling in L2Core
  const L2Core = await L2CorePromise;
  const state = await L2Core.getLatestState();

  const accountIndex = await state.getAccountIndexByAddress(accountAddress);
  const toAccountIndex = await state.getAccountIndexByAddress(toAccountAddress);

  const errors = validateInputs(accountIndex, toAccountIndex);

  if (errors.length > 0) {
    return {
      errors
    };
  }

  const account = await state.getAccount(accountIndex);
  const toAccount = await state.getAccount(toAccountIndex);

  const softTransfer = new SoftTransfer({
    accountIndex,
    toAccountIndex,
    nonce,
    value,
    signature
  });

  const error = softTransfer.checkValid(account, true);

  let success;
  if (error) {
    errors.push(error);
    success = false;
  } else {
    //TODO: this will return once the transaction has been executed. should we await here?
    await TransactionQueue.queueTransaction(softTransfer);
    success = true;
  }

  return {
    account,
    toAccount,
    ...softTransfer,
    errors,
    success
  };
}

function validateInputs(accountIndex: number, toAccountIndex: number,) {
  const errors = [];

  if (accountIndex === null) {
    errors.push("Account does not exist for address; cannot transfer funds from account");
  }

  if (toAccountIndex === null) {
    errors.push("Account does not exist for address; cannot transfer funds to account; try Soft Create transaction");
  }

  return errors;
}
