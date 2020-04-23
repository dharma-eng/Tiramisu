const keccak256 = require("./keccak256");

function getParent(a, b) {
  return keccak256(Buffer.concat([a, b]));
}

export function getMerkleRoot(leaves: Buffer[]): Buffer {
  if (leaves.length == 0) return Buffer.alloc(32, 0);
  let nextLevelLength = leaves.length;
  let currentLevel = 0;
  // bytes32[160] memory defaultHashes = getDefaultHashes();
  let nodes = []; // Add one in case we have an odd number of leaves
  // Generate the leaves
  for (let i = 0; i < leaves.length; i++) nodes[i] = keccak256(leaves[i]);
  if (leaves.length == 1) return nodes[0];
  // Add a defaultNode if we've got an odd number of leaves
  if (nextLevelLength % 2 == 1) {
    nodes[nextLevelLength] = Buffer.alloc(32, 0);
    nextLevelLength += 1;
  }

  // Now generate each level
  while (nextLevelLength > 1) {
    currentLevel += 1;
    // Calculate the nodes for the currentLevel
    for (let i = 0; i < nextLevelLength / 2; i++) {
      nodes[i] = getParent(nodes[i * 2], nodes[i * 2 + 1]);
    }
    nextLevelLength = nextLevelLength / 2;
    // Check if we will need to add an extra node
    if (nextLevelLength % 2 == 1 && nextLevelLength != 1) {
      nodes[nextLevelLength] = Buffer.alloc(32, 0);
      nextLevelLength += 1;
    }
  }
  return nodes[0];
}

const isOdd = n => n % 2 == 1;

export function getMerkleProof(leaves: Buffer[], index: number) {
  let levels = [];
  const putInLevel = (l, n) => {
    if (!levels[l]) levels[l] = [];
    levels[l].push(n);
  };

  if (leaves.length == 0)
    return {
      root: Buffer.alloc(32, 0),
      siblings: []
    };
  let nextLevelLength = leaves.length;
  let currentLevel = 0;
  // bytes32[160] memory defaultHashes = getDefaultHashes();
  let nodes = []; // Add one in case we have an odd number of leaves
  // Generate the leaves
  for (let i = 0; i < leaves.length; i++) {
    let node = keccak256(leaves[i]);
    putInLevel(0, node);
    nodes[i] = node;
  }
  //
  if (leaves.length == 1) return { root: nodes[0], siblings: [] };
  // Add a defaultNode if we've got an odd number of leaves
  if (nextLevelLength % 2 == 1) {
    let node = Buffer.alloc(32, 0);
    putInLevel(0, node);
    nodes[nextLevelLength] = node;
    nextLevelLength += 1;
  }

  // Now generate each level
  while (nextLevelLength > 1) {
    currentLevel += 1;
    // Calculate the nodes for the currentLevel
    for (let i = 0; i < nextLevelLength / 2; i++) {
      let node = getParent(nodes[i * 2], nodes[i * 2 + 1]);
      putInLevel(currentLevel, node);
      nodes[i] = node;
    }
    nextLevelLength = nextLevelLength / 2;
    // Check if we will need to add an extra node
    if (nextLevelLength % 2 == 1 && nextLevelLength != 1) {
      let node = Buffer.alloc(32, 0);
      putInLevel(currentLevel, node);
      nodes[nextLevelLength] = node;
      nextLevelLength += 1;
    }
  }
  let root,
    siblings = [];
  // console.log(levels)
  root = nodes[0];
  for (let i = 0; i < levels.length - 1; i++) {
    let numNext = Math.floor(index / 2 ** i);
    if (isOdd(numNext)) siblings.push(levels[i][numNext - 1]);
    else siblings.push(levels[i][numNext + 1]);
  }
  return { root, siblings };
}
