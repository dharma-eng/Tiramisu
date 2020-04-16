const MockDharmaPeg = artifacts.require("MockDharmaPeg");
const MockDharmaDai = artifacts.require("MockDharmaDai");
const MerkleProofLib = artifacts.require("MerkleProofLib");

module.exports = function(deployer) {
  deployer.deploy(MerkleProofLib);
  deployer.link(MerkleProofLib, MockDharmaPeg);
  deployer
    .deploy(MockDharmaDai, 5000, "Dharma Dai", "DDAI")
    .then((deployed) => deployer.deploy(MockDharmaPeg, deployed.address));
};
