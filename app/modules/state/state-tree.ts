// const path = require('path');
// const fs = require('fs');
const { BaseDB, SparseMerkleTreeImpl, keccak256 } = require('sparse-merkle-tree');
const MemDown = require('memdown');

// const dbRootPath = path.join(__dirname, 'db');
// fs.mkdirSync(dbRootPath, { recursive: true });

// const hashBuffer = Buffer.alloc(64);
const hashFunction = keccak256;
const bufferHashFunction = (buff) =>
  Buffer.from(hashFunction(buff.toString('hex')), 'hex')
// const zeroHash = bufferHashFunction(SparseMerkleTreeImpl.emptyBuffer)

const depth = 32;

const memdown = new MemDown();
const db = new BaseDB(memdown, 256);

const getTree = () => SparseMerkleTreeImpl.create(
  db,
  undefined,
  depth,
  hashFunction
);

export default getTree;