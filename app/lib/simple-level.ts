import MemDown from 'memdown'
import leveldown from 'leveldown'
import levelup, { LevelUp } from 'levelup'
import path from 'path';

/**
 * Checks if an error is a NotFoundError.
 * @param err Error to check.
 * @return `true` if the error is a NotFoundError, `false` otherwise.
 */
const isNotFound = (err) => {
  if (!err) return false

  return (
    err.notFound ||
    err.type === 'NotFoundError' ||
    /not\s*found/i.test(err.message)
  )
}

export type JsonBaseType = boolean | string | number | null;
export type JsonType = JsonBaseType | Array<JsonType> | { [key: string]: JsonType }
export type JsonLike = JsonType | { toJSON(key?: any): JsonType };

class SimpleLevel {
  db: LevelUp;

  constructor(name: string, dbPath?: string) {
    if (dbPath) this.db = levelup(leveldown(path.join(dbPath, name)));
    else this.db = levelup(new MemDown());
  }

  async put(key: JsonBaseType, value: JsonLike): Promise<void> {
    return new Promise((resolve, reject) => {
      const k = JSON.stringify(key);
      const v = JSON.stringify(value);
      this.db.put(k, v, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async get(key: JsonBaseType) {
    const k = JSON.stringify(key);
    return this.db.get(k).then(v => JSON.parse(v)).catch(err => {
      if (isNotFound(err)) return null;
      throw err
    });
  }

  open = (): Promise<void> => this.db.open();

  close = (): Promise<void> => this.db.close();
}

export default SimpleLevel;