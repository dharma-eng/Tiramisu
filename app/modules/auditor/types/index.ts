import { BlockError } from './block-errors';
import { ExecutionError } from './execution-errors';
import { TransactionError } from './transaction-errors';

export * from './inclusion-proofs';
export * from './block-errors';
export * from './execution-errors';

export type ErrorProof = BlockError | ExecutionError | TransactionError;

export class ProvableError extends Error {
  constructor(public errorProof: ErrorProof) {
    super('Caught provable error.');
  }
}