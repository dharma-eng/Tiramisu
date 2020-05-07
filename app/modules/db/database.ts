import BlockDatabase from "./block-database";
import BlockHashDatabase from "./blockhash-database";
import Block from "../block";
import { State } from "../state";

const defaultBlockInfo = {
  version: 0,
  hardTransactionsCount: 0,
  blockNumber: -1
}

export class Database {
  constructor(
    public blocksDB: BlockDatabase,
    public blockHashDB: BlockHashDatabase,
    private dbPath?: string
  ) {}

  async close() {
    await this.blockHashDB.close();
    await this.blocksDB.close();
  }

  static async create(dbPath?: string) {
    const blocksDB = new BlockDatabase(dbPath);
    const blockHashDB = await BlockHashDatabase.create(dbPath);
    return new Database(blocksDB, blockHashDB, dbPath);
  }

  async putBlock(block: Block) {
    const blockHash = block.blockHash();
    await this.blockHashDB.push(block.header.blockNumber, blockHash);
    await this.blocksDB.put(blockHash, block);
  }

  /**
   * Reads a block from the database given a block hash or number.
   * If block number is given, an optional index field can also be passed.
   */
  async getBlock(height: number, index?: number): Promise<Block>
  async getBlock(blockHash: string): Promise<Block>
  async getBlock(hashOrHeight: string | number): Promise<Block>
  async getBlock(hashOrHeight: string | number, index?: number): Promise<Block> {
    let blockHash: string;
    if (typeof hashOrHeight == 'string') blockHash = hashOrHeight;
    else {
      if (index != undefined) blockHash = (await this.blockHashDB.blockHashes(hashOrHeight))[index];
      else blockHash = await this.blockHashDB.latest(hashOrHeight);
    }
    return this.blocksDB.get(blockHash);
  }

  /**
   * Read the latest block from the database.
   * @param height Optional field to specify which block height to read the latest hash from.
   */
  async latest(height?: number): Promise<Block> {
    const blockHash = await this.blockHashDB.latest(height);
    return this.getBlock(blockHash);
  }

  async getBlockOrDefault(hashOrNumber?: string | number):
      Promise<{ version: number, hardTransactionsCount: number, blockNumber: number, stateRoot?: string }>
    {
      let block = (hashOrNumber != undefined)
        ? await this.getBlock(hashOrNumber)
        : await this.latest();
      return block ? block.header : defaultBlockInfo;
    }

  async getState(rootHash?: string): Promise<State> {
    return State.create(this.dbPath, rootHash);
  }
}

export default Database;