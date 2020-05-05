import { BaseDB, SparseMerkleTreeImpl, keccak256 } from 'sparse-merkle-tree';
import { LevelSideways } from '../../lib/simple-level';

const depth = 32;

export const getTree = (db: LevelSideways, rootHash?: Buffer) => SparseMerkleTreeImpl.create(
  new BaseDB(db, 256),
  rootHash,
  depth,
  keccak256
);