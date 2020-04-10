const MemDown = require('memdown');

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

class SimpleMemdown {
  constructor() {
    this.db = new MemDown();
  }

  async put(key, value) {
    return new Promise((resolve, reject) => {
      const k = key.toString();
      const v = value.toString();
      this.db.put(k, v, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      const k = key.toString();
      this.db.get(k, { asBuffer: false }, (err, value) => {
        if (err) {
          if (isNotFound(err)) return resolve(null);
          return reject(err);
        }
        resolve(value);
      });
    });
  }
}

module.exports = SimpleMemdown;