import { toBuf, toInt, toHex, toNonPrefixed, sliceBuffer } from "./to";
import {
  HardCreate,
  HardDeposit,
  HardWithdraw,
  HardAddSigner,
  HardTransactionUnion
} from "../modules/transactions";
import { State } from "../modules";

const toBufAndPrefix = (encodedTx: string): [Buffer, number] => {
  const buf = toBuf(toNonPrefixed(encodedTx));
  const prefix = toInt(encodedTx.slice(2, 4));
  return [buf, prefix];
}

export async function decodeHardTransactions(
  state: State, startIndex: number, hardTransactions: string[]
): Promise<HardTransactionUnion[]> {
  let newSize = +(state.size.toString()); // brutish copy
  const pendingCreates: { [key: string]: number } = {};
  const arr = [];
  const getAccountIndex = async (address: string): Promise<number | null> => {
    // Check if there is a pending account index for the address
    let accountIndex = pendingCreates[address];
    // If not, check if the address already has an account index in the state
    if (accountIndex == undefined) accountIndex = await state.getAccountIndexByAddress(address);
    return accountIndex;
  }
  for (let i = 0; i < hardTransactions.length; i++) {
    const hardTransactionIndex = startIndex + i;
    const hardTransaction = hardTransactions[i];
    const [buf, prefix] = toBufAndPrefix(hardTransaction);
    let transaction: HardTransactionUnion;
    if (prefix == 0) {
      // Decode the tx as a create
      const create = HardCreate.fromLayer1(hardTransactionIndex, buf);
      // Get the existing or pending account index
      let accountIndex = await getAccountIndex(create.accountAddress);
      if (accountIndex != null) {
        // If we found an index, translate it to a deposit.
        transaction = HardDeposit.fromCreate(create, accountIndex);
      } else {
        // Mark the address as having a pending index
        pendingCreates[create.accountAddress] = newSize++;
        transaction = create;
      }
    } else if (prefix == 2) {
      transaction = HardWithdraw.fromLayer1(hardTransactionIndex, buf);
    } else if (prefix == 3) {
      transaction = HardAddSigner.fromLayer1(hardTransactionIndex, buf);
    }
    
    arr.push(transaction);
  }
  return arr;
}

export default decodeHardTransactions;
