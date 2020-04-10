const crypto = require('crypto');

function randomHexString(size) {
  const bytes = crypto.randomBytes(size);
  return bytes.toString('hex');
}

function randomHexBuffer(size) {
  const bytes = randomHexString(size);
  return Buffer.from(bytes, 'hex');
}

module.exports = {
  randomHexString,
  randomHexBuffer
}