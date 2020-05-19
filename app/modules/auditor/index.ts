import { EventEmitter } from 'events';
import ParentInterface, { BlockSubmissionEvent } from "../parent-interface";
import { Database } from "../db";
import BlockAuditor from "./block-auditor";
import AuditProofProvider from "./provider";
import { ProvableError, ErrorProof } from "./types";
import { ExecutionAuditor } from "./execution-auditor";
import Block from '../block';
import { State } from '../state';
import { getErrorProofFunctionInput } from './function-mapper';

export class Auditor extends EventEmitter {
  private _provider: AuditProofProvider;
  constructor(
    private _db: Database,
    private _parentInterface: ParentInterface
  ) {
    super();
    this._provider = new AuditProofProvider(this._db, _parentInterface);
    this._parentInterface.getSubmissionListener(
      (event: BlockSubmissionEvent) => this.handleBlockSubmission(event)
    );
    console.log(`Started auditor: listening for block submissions...`)
  }

  async handleBlockSubmission(event: BlockSubmissionEvent) {
    // console.log(`Got block submission event!`)
    // console.log(`Getting submitted block data from transaction: ${event.transactionHash}.`)
    this.emit('block-submission', event);
    const calldata = await this._parentInterface.getTransactionInput(event.transactionHash);
    this.auditSubmittedBlock(calldata, event.blockNumber);
  }

  async promAudit(submitCalldata: Buffer, blockNumber: number): Promise<{ block: Block, state: State }> {
    const { block, parentBlock } = await BlockAuditor.validateBlockInput(this._provider, submitCalldata, blockNumber).catch(err => {
      throw err
    });
    const state = await ExecutionAuditor.auditBlockExecution(this._provider, parentBlock, block).catch(err => {
      throw err
    });
    return { block, state };
  }

  async proveError(proof: ErrorProof): Promise<any> {
    const input = getErrorProofFunctionInput(proof);
    const receipt = await this._parentInterface.proveError(input);
    return (receipt.events && receipt.events.BlockReverted) || receipt;
  }

  async auditSubmittedBlock(
    submitCalldata: Buffer,
    blockNumber: number
  ) {
    this.emit('begin-audit', null)
    await this.promAudit(submitCalldata, blockNumber).then(async ({ block, state }) => {
      await state.commit(this._db.dbPath)
      await this._db.putBlock(block);
      console.log(`Audited block and found no errors.`);
      this.emit('audit:block-ok', block)
    }).catch((err) => {
      if (err instanceof ProvableError) {
        this.emit('audit:block-error', err.errorProof)
        // TODO - handle error proof submission
        console.log(`Caught provable error: TYPE ${err.errorProof._type}`);
        // console.log(`Proof of error:`)
        // console.log(err.errorProof);
      } else {
        this.emit('audit:uncaught-error', err);
        console.error(`Caught unknown error`);
        console.error(err)
      }
    })
  }
}

export default Auditor;