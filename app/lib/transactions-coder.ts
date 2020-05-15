import {
  TransactionMetadata, Transactions,
  Transaction, TransactionsJson,
  SoftWithdrawal, HardAddSigner, HardWithdraw, HardDeposit, HardCreate, SoftCreate, SoftTransfer, SoftChangeSigner
} from "../modules/transactions/";

import { getMerkleRoot } from "./merkle";
import { sliceBuffer } from "./to";

const TxTypes = [
  HardCreate,
  HardDeposit,
  HardWithdraw,
  HardAddSigner,
  SoftWithdrawal,
  SoftCreate,
  SoftTransfer,
  SoftChangeSigner
];

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
    (arr, key) => [...arr, ...(transactions[key] || [])],
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

export function fromTransactionsJson(transactionsJson: TransactionsJson): TransactionEncoderOutput & { transactions: Transactions } {
  const transactions = keys.reduce(
    (obj, key, i) => ({
      ...obj,
      [key]: (transactionsJson[key] || []).map(t => new TxTypes[i](t)),
    }),
    {}
  );
  return { ...encodeTransactions(transactions), transactions };
}

export type TransactionDecoderOutput = {
  metadata: TransactionMetadata;
  transactions: Transactions;
}

export class DecodeTransactionError extends Error {
  constructor(transactionIndex?: number, bufferIndex?: number, expectedSize?: number, bufferLength?: number) {
    const remainder = bufferLength - bufferIndex;
    const msg = [
      `Transaction decoding error at index ${transactionIndex}`,
      `Expected ${expectedSize} bytes in buffer at index ${bufferIndex}`,
      `But buffer only had ${remainder} remaining bytes.`
    ].join('\n');
    super(msg);
  }
}

const range = <T = any>(len: number, cb: (n?: number) => T) => new Array(len).fill(null).map((_, i) => cb(i));

export type Constructor<T> = new (...args) => T;
export type Decoder<T> = (buf: Buffer) => T;
export type TxTypeTuple = [Decoder<Transaction>, number]
const txTypes: Array<TxTypeTuple> = [
  [HardCreate.decode, 88], [HardDeposit.decode, 48],
  [HardWithdraw.decode, 68], [HardAddSigner.decode, 61],
  [SoftWithdrawal.decode, 131], [SoftCreate.decode, 155],
  [SoftTransfer.decode, 115], [SoftChangeSigner.decode, 125]
];

export function decodeTransactionsData(buf: Buffer): Transactions {
  if (buf.length < 16) throw new DecodeTransactionError();
  const metadata = new TransactionMetadata(sliceBuffer(buf, 0, 16)).metadata;
  let index = 0;
  let bufIndex = 16;
  const transactions: Transactions = keys.reduce((obj, k, i) => {
    const [decoder, size] = txTypes[i];
    const num = metadata[k];
    if (!num) return obj;
    obj[k] = range(num, (ind) => {
      if (buf.byteLength < bufIndex + size) throw new DecodeTransactionError(index, bufIndex, size, buf.byteLength);
      const txBuf = sliceBuffer(buf, bufIndex, size);
      const tx = decoder(txBuf);
      index++;
      bufIndex += size;
      return tx;
    });
    return obj;
  }, {});
  return transactions;
}
