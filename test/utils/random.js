const crypto = require("crypto");
const { privateToAddress } = require("ethereumjs-utils");
const { toHex } = require("../../app/lib/to");

function randomHexString(size) {
  const bytes = crypto.randomBytes(size);
  return bytes.toString("hex");
}

function randomHexBuffer(size) {
  const bytes = randomHexString(size);
  return Buffer.from(bytes, "hex");
}

const randomAccount = () => {
  let privateKey = randomHexBuffer(32);
  let address = toHex(privateToAddress(privateKey));
  return { privateKey, address };
};

module.exports = {
  randomHexString,
  randomHexBuffer,
  randomAccount
};
