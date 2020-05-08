import SimpleLevel from '../../lib/simple-level';

export type BlockHashes = string[];
export type Latest = {
  height: number;
  blockHash: string;
}

export class BlockHashDatabase extends SimpleLevel {
  _latest?: number;

  constructor(dbPath?: string) {
    super('blocks', dbPath);
  }

  static async create(dbPath?: string): Promise<BlockHashDatabase> {
    const db = new BlockHashDatabase(dbPath);
    await db.init();
    return db;
  }

  async init(): Promise<void> {
    const n = await this.get('latest');
    this._latest = n || 0;
  }

  /**
   * Get the array of block hashes stored for a given height.
   */
  async blockHashes(height: number): Promise<BlockHashes> {
    return (await this.get(height)) || [];
  }

  /**
   * Get the number of block hashes stored for a given height.
   */
  async length(height: number): Promise<number> {
    const arr = await this.blockHashes(height);
    return arr.length;
  }

  /**
   * Check if there are any block hashes stored for a given height.
  */
  async has(height: number): Promise<boolean> {
    return (await this.length(height)) != 0;
  }

  private async update(height: number, blockHashes: BlockHashes): Promise<void> {
    // uses gte to handle height = 0
    if (height >= this._latest) {
      this._latest = height;
      await this.put('latest', height);
    }
    await this.put(height, blockHashes);
  }

  /**
   * Push a blockhash to the database.
   * If a height is passed, will put the block hash at the beginning of the array for that height.
   * If no height is given, will increment the latest height and put the block hash at the beginning of the new array.
   */
  async push(blockHash: string): Promise<void>;
  async push(height: number, blockHash: string): Promise<void>;
  async push(paramOne: number | string, paramTwo?: string): Promise<void> {
    let height: number;
    let blockHash: string;
    if (typeof paramOne == 'number') {
      if (!paramTwo) throw new Error(`Must pass blockhash if height is given.`);
      height = paramOne;
      blockHash = paramTwo;
    } else {
      height = this._latest;
      // If height is zero and there are no hashes in the 0th array, use 0 as the height.
      // Otherwise, increment height by 1.
      if (!(height == 0 && !this.has(height))) height += 1;
      blockHash = paramOne;
    }
    const arr = await this.blockHashes(height);
    arr.unshift(blockHash);
    await this.update(height, arr);
  }

  /**
   * Get the latest block hash for a given height, if one is passed.
   * If no hash is passed, get the latest block height and the latest block hash for that height.
   */
  async latest(): Promise<Latest>
  async latest(height: number): Promise<string>
  async latest(_height?: number): Promise<Latest | string> {
    let height = _height || this._latest;
    const arr = await this.blockHashes(height);
    const blockHash = arr[0];
    if (_height) return blockHash;
    return { height, blockHash };
  }
}

export default BlockHashDatabase;
