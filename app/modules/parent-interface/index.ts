import Block from "../block";
import { toBuf } from "../../lib";
import { ErrorProofFunctionInput } from "../auditor/types/functions";

export type BlockSubmissionEvent = {
  event: string;
  signature: string | null;
  address: string;
  blockNumber: number;
  transactionHash: string;
}

export type SubmissionHandler = (event: BlockSubmissionEvent) => void | Promise<void>;

export class ParentInterface {
  constructor(
    public tiramisuContract: any,
    public from: string,
    public web3: any,
    public maxHardTransactions: number = 10
  ) {}

  currentBlockNumber = async (): Promise<number> => this.web3.eth.getBlockNumber();

  /**
   * Gets an array of encoded hard transactions from the Tiramisu contract.
   */
  async getHardTransactions(hardTransactionsIndex: number, max: number = this.maxHardTransactions): Promise<string[]> {
    const hardTransactions = await this.tiramisuContract.methods
        .getHardTransactionsFrom(hardTransactionsIndex, max)
        .call();
    return hardTransactions;
  }

  /**
   * Submits a block to the Tiramisu contract.
   */
  async submitBlock(block: Block): Promise<void> {
    const receipt = await this.tiramisuContract.methods
      .submitBlock(block)
      .send({ gas: 5e6, from: this.from });
    const {
      events: {
        BlockSubmitted: { blockNumber }
      }
    } = receipt;
    block.addOutput(blockNumber);
  }

  /**
   * Confirms a block on the Tiramisu contract.
   * @notice This currently always works because of the configuration we're using.
   *         Once we work out the config details, we'll need some pre-execution verification that the block is ready.
   */
  async confirmBlock(block: Block): Promise<void> {
    const header = block.commitment;
    await this.tiramisuContract.methods
      .confirmBlock(header)
      .send({ gas: 5e6, from: this.from });
  }

  async getSubmissionListener(cb: SubmissionHandler) {
    // TODO
    // Handle 'error' & 'changed' events
    this.tiramisuContract.events.BlockSubmitted()
      .on('data', (event: BlockSubmissionEvent) => cb(event));
  }

  async getTransactionInput(transactionHash: string): Promise<Buffer> {
    const transaction = await this.web3.eth.getTransaction(transactionHash);
    return toBuf(transaction.input);
  }

  async proveError(input: ErrorProofFunctionInput): Promise<any> {
    return this.tiramisuContract.methods[input.name](...input.data).send({ from: this.from, gas: 5e6 });
  }

  async submitWithdrawals(
    parent: Block,
    block: Block
  ): Promise<any> {
    return this.peg.methods.executeWithdrawals(
      parent.commitment,
      block.commitment,
      block.transactionsData
    );
  }
}

export default ParentInterface;