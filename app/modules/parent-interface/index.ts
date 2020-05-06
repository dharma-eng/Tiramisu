import Block from "../block";

export class ParentInterface {
  constructor(
    public peg: any,
    public from: string,
    public web3: any,
    public maxHardTransactions: number = 10
  ) {}

  currentBlockNumber = async (): Promise<number> => this.web3.eth.getBlockNumber();

  /**
   * Gets an array of encoded hard transactions from the chain peg.
   */
  async getHardTransactions(hardTransactionsIndex: number): Promise<string[]> {
    const hardTransactions = await this.peg.methods
        .getHardTransactionsFrom(hardTransactionsIndex, this.maxHardTransactions)
        .call();
    return hardTransactions;
  }

  /**
   * Submits a block to the chain peg.
   */
  async submitBlock(block: Block): Promise<void> {
    const receipt = await this.peg.methods
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
   * Confirms a block on the chain peg.
   * @notice This currently always works because of the configuration we're using.
   *         Once we work out the config details, we'll need some pre-execution verification that the block is ready.
   */
  async confirmBlock(block: Block): Promise<void> {
    const header = block.commitment;
    await this.peg.methods
      .confirmBlock(header)
      .send({ gas: 5e6, from: this.from });
  }
}

export default ParentInterface;