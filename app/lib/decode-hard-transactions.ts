import { toBuf, toInt, toHex, toNonPrefixed } from "./to";
import {
  HardCreate,
  HardDeposit,
  HardWithdraw,
  HardAddSigner,
  Transaction
} from "../modules/transactions";

async function decodeHardTransaction(state, hardTransactionIndex, _encoded) {
  let encoded = toNonPrefixed(_encoded);
  let buf = toBuf(_encoded);
  let prefix = toInt(encoded.slice(0, 2));
  if (prefix == 0) {
    /* Either a hard create or hard deposit */
    const create = HardCreate.fromLayer1(hardTransactionIndex, buf);
    let accountIndex = await state.getAccountIndexByAddress(
      create.accountAddress
    );
    if (accountIndex != null)
      return HardDeposit.fromCreate(create, accountIndex);
    return create;
  }
  if (prefix == 2) return HardWithdraw.fromLayer1(hardTransactionIndex, buf);
  if (prefix == 3) return HardAddSigner.fromLayer1(hardTransactionIndex, buf);
}

export async function decodeHardTransactions(state, startIndex, hardTransactions): Promise<Transaction[]> {
  const arr = [];
  for (let i = 0; i < hardTransactions.length; i++) {
    const hardTransactionIndex = startIndex + i;
    const hardTransaction = hardTransactions[i];
    const obj = await decodeHardTransaction(
      state,
      hardTransactionIndex,
      hardTransaction
    );
    arr.push(obj);
  }
  return arr;
}

export default decodeHardTransactions;
