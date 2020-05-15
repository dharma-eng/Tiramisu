import { AccountProof, TransactionProof, PreviousStateProof, PreviousRootProof, TransactionStateProof } from "./types";
import Block, { Commitment, Header } from "../block";
import { BufferLike, toBuf, sliceBuffer, toHex, decodeTransactionsData, keccak256 } from "../../lib";
import { AccountProofAbi, CommitmentAbi, TransactionProofAbi, TransactionStateProofAbi, BlockInputAbi } from "./abi";

const ABI = require('web3-eth-abi');

const encodeCommitment = (commitment: Commitment): string =>
  ABI.encodeParameter(CommitmentAbi, commitment);

const encodeAccountProof = (proof: AccountProof): string =>
  ABI.encodeParameter(AccountProofAbi, proof);

const encodeTransactionProof = (proof: TransactionProof): string =>
  ABI.encodeParameter(TransactionProofAbi, proof);

export function encodeTransactionStateProof({
  previousRootProof: rootProof, header, transactionIndex, siblings
}: TransactionStateProof): string {
  return ABI.encodeParameter(
    TransactionStateProofAbi,
    {
      header,
      transactionIndex,
      siblings,
      previousRootProof: (rootProof._type == 'commitment')
        ? encodeCommitment(rootProof)
        : encodeTransactionProof(rootProof)
    }
  );
}

export type SolBlockInput = {
  header: {
    version: string,
    blockNumber: string,
    stateSize: string,
    stateRoot: string,
    hardTransactionsCount: string,
    transactionsRoot: string,
  },
  transactionsData: string
}

export type SubmittedBlock = {
  raw: SolBlockInput;
  commitment: Commitment;
}

export function decodeBlockSubmitCalldata(calldata: BufferLike, submittedAt: number): SubmittedBlock {
  const buf = toBuf(calldata);
  const data = sliceBuffer(buf, 4);
  const blockInput = <SolBlockInput> ABI.decodeParameter(BlockInputAbi, toHex(data));
  const header: Header = {
    version: +blockInput.header.version,
    blockNumber: +blockInput.header.blockNumber,
    stateSize: +blockInput.header.stateSize,
    stateRoot: blockInput.header.stateRoot,
    hardTransactionsCount: +blockInput.header.hardTransactionsCount,
    transactionsRoot: toBuf(blockInput.header.transactionsRoot)
  };
  const commitment = {
    ...header,
    transactionsHash: toHex(keccak256(blockInput.transactionsData)),
    submittedAt
  };
  return {
    raw: blockInput,
    commitment
  };
}

export function decodeSubmittedBlock(submitted: SubmittedBlock): Block {
  const transactionsBuffer = toBuf(submitted.raw.transactionsData);
  const transactions = decodeTransactionsData(transactionsBuffer);
  const commitment = {
    ...submitted.commitment,
    transactionsRoot: toHex(submitted.commitment.transactionsRoot)
  }
  const block = new Block({ commitment, transactions });
  return block;
}