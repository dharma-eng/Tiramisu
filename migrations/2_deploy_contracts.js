const MockTiramisu = artifacts.require("MockTiramisu");
const MockToken = artifacts.require("MockToken");

module.exports = function(deployer) {
  deployer
    .deploy(MockToken, 5000, "Mock ERC20 Token", "MOCK")
    .then(deployed => deployer.deploy(MockTiramisu, deployed.address));
};
