/* Takes an array of transaction objects -- must be of the types defined in app/types */
export function sortTransactions(transactions) {
  const arrays = new Array(8).fill(null).map(() => []);
  for (let tx of transactions) arrays[tx.prefix].push(tx);
  const [
    hardCreates,
    hardDeposits,
    hardWithdrawals,
    hardAddSigners,
    softWithdrawals,
    softCreates,
    softTransfers,
    softChangeSigners
  ] = [...arrays];
  
  const hardSort = (arr) => arr.sort((a, b) => a.hardTransactionIndex - b.hardTransactionIndex);
  [hardCreates, hardDeposits, hardWithdrawals, hardAddSigners].map(a => hardSort(a));
  return {
    hardCreates,
    hardDeposits,
    hardWithdrawals,
    hardAddSigners,
    softWithdrawals,
    softCreates,
    softTransfers,
    softChangeSigners
  }
}

export default sortTransactions;