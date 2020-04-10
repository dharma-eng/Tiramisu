/* Takes an array of transaction objects -- must be of the types defined in app/types */
function sortTransactions(transactions) {
  const arrays = new Array(8).fill([]);
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
  ] = arrays;
  const hardSort = (arr) => arr.sort((a, b) => a.hardTransactionIndex - b.hardTransactionIndex);
  [hardCreates, hardDeposits, hardWithdrawals, hardAddSigners].map(hardSort)
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

module.exports = sortTransactions;