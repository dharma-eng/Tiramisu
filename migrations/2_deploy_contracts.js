const MockDharmaPeg = artifacts.require("mocks/MockDharmaPeg.sol");
const MerkleProofLib = artifacts.require("lib/merkle/MerkleProofLib.sol");

module.exports = function(deployer) {
  deployer.deploy(MerkleProofLib);
  deployer.link(MerkleProofLib, MockDharmaPeg);
  deployer.deploy(MockDharmaPeg);
};