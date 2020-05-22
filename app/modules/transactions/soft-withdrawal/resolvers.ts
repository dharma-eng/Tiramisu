import { TiramisuCorePromise, toHex, UNSIGNED } from "../../../index";
import SoftWithdrawal from "./";
import TransactionQueue from "../../transactions-queue";

export async function getUnsignedSoftWithdrawalResolver(
  parentValue,
  { accountAddress, withdrawalAddress, value },
  auth
) {
  //TODO: update pulling in TiramisuCore
  const TiramisuCore = await TiramisuCorePromise;
  const state = await TiramisuCore.getLatestState();

  const accountIndex = await state.getAccountIndexByAddress(accountAddress);

  const errors = validateInputs(accountIndex, withdrawalAddress);

  if (errors.length > 0) {
    return {
      errors
    };
  }

  const account = await state.getAccount(accountIndex);

  const softWithdrawal = new SoftWithdrawal({
    accountIndex,
    withdrawalAddress,
    nonce: account.nonce,
    value,
    signature: UNSIGNED
  });

  const error = softWithdrawal.checkValid(account, false);

  if (error) {
    errors.push(error);
  }

  const messageHash = toHex(softWithdrawal.toMessageHash());

  return {
    account,
    ...softWithdrawal,
    messageHash,
    errors
  };
}

export async function submitSoftWithdrawalResolver(
  parentValue,
  { accountAddress, withdrawalAddress, value, nonce, signature },
  auth
) {
  //TODO: update pulling in TiramisuCore
  const TiramisuCore = await TiramisuCorePromise;
  const state = await TiramisuCore.getLatestState();

  const accountIndex = await state.getAccountIndexByAddress(accountAddress);

  const errors = validateInputs(accountIndex, withdrawalAddress);

  if (errors.length > 0) {
    return {
      errors
    };
  }

  const account = await state.getAccount(accountIndex);

  const softWithdrawal = new SoftWithdrawal({
    accountIndex,
    withdrawalAddress,
    nonce,
    value,
    signature
  });

  const error = softWithdrawal.checkValid(account, true);

  let success;
  if (error) {
    errors.push(error);
    success = false;
  } else {
    //TODO: this will return once the transaction has been executed. should we await here?
    await TransactionQueue.queueTransaction(softWithdrawal);
    success = true;
  }

  return {
    account,
    ...softWithdrawal,
    errors,
    success
  };
}

function validateInputs(accountIndex: number, withdrawalAddress: string) {
  const errors = [];

  if (accountIndex === null) {
    errors.push("Account does not exist for address; cannot transfer funds from account");
  }

  //TODO: validate withdrawal address is valid ETH address

  return errors;
}


