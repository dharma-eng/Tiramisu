const createKeccakHash = require('keccak');

module.exports = function keccak256(a) {
  return createKeccakHash(`keccak256`).update(a).digest();
}