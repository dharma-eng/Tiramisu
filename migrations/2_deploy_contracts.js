const MockTiramisu = artifacts.require("MockTiramisu");
const MockToken = artifacts.require("MockToken");
const MerkleProofLib = artifacts.require("MerkleProofLib");

module.exports = function(deployer) {
  deployer.deploy(MerkleProofLib);
  deployer.link(MerkleProofLib, MockTiramisu);
  deployer
    .deploy(MockToken, 5000, "Mock ERC20 Token", "MOCK")
    .then(deployed => deployer.deploy(MockTiramisu, deployed.address));
};
