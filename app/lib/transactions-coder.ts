import { TransactionMetadata, Transactions, Transaction } from "../modules/transactions/";
import { getMerkleRoot } from "./merkle";
// import { sliceBuffer } from './to';

const keys = [
  'hardCreates',
  'hardDeposits',
  'hardWithdrawals',
  'hardAddSigners',
  'softWithdrawals',
  'softCreates',
  'softTransfers',
  'softChangeSigners'
];

export type TransactionEncoderOutput = {
  metadata: TransactionMetadata;
  transactionsData: Buffer;
  transactionsRoot: Buffer;
  transactionsArray: Transaction[];
}

export function transactionsToArray(transactions: Transactions): Transaction[] {
  return keys.reduce(
    (arr, key) => [...arr, ...transactions[key]],
    []
) as Transaction[];
}

export function encodeTransactions(transactions: Transactions): TransactionEncoderOutput {
  const transactionsArray = transactionsToArray(transactions);
  /* Encode transactions with their prefixes, calculate merkle root. */
  const leaves = transactionsArray.map(t => t.encode(true)) as Buffer[];
  const transactionsRoot = getMerkleRoot(leaves);

  /* Encode transactions without their prefixes and concatenate them. Place the encoded metadata at the beginning. */
  const metadata = TransactionMetadata.fromTransactions(transactions);
  const transactionsData = Buffer.concat([
    metadata.encode(),
    ...transactionsArray.map(t => t.encode(false))
  ]);
  return { transactionsRoot, metadata, transactionsData, transactionsArray };
}

// export type TransactionDecoderOutput = {
//   metadata: TransactionMetadata;
//   transactions: Transactions;
// }

// export class DecodeTransactionError extends Error {
//   constructor(public transactionIndex: number) { super(); }
// }

// const range = (len: number, cb: (n?: number) => void) => new Array(len).fill(null).map((_, i) => cb(i));

// export type Constructor<T> = new (...args) => T;
// export type TxTypeTuple = [Constructor<Transaction>, number]
// const txTypes: Array<TxTypeTuple> = [
//   [HardCreate, 88], [HardDeposit, 48],
//   [HardWithdraw, 68], [HardAddSigner, 61],
//   [SoftWithdrawal, 131], [SoftCreate, 155],
//   [SoftTransfer, 115], [SoftChangeSigner, 125]
// ];

// export function decodeTransactionsData(buf: Buffer) {
//   const metadata = new TransactionMetadata(sliceBuffer(buf, 0, 16));
//   const transactions = {};
//   let index = 0;
//   let bufIndex = 16;
  
//   keys.reduce((obj, k, i) => {
//     const [_class, size] = txTypes[i];
//     const num = metadata.metadata[k];
//     // if (bufIndex + (num * size) < buf.byteLength) throw new DecodeTransactionError(index);
//     transactions[k] = range(num, () => {
//       if (bufIndex + size < buf.byteLength) throw new DecodeTransactionError(index);
//       index++;
//       bufIndex += size;
//       return new _class()
//     })
//     for (let x = 0; x < num; x++) transactions[k] 
//   }, {})
// }
