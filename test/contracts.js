async function getContractFromExternalHost(contractName, ...args) {
  const Contract = artifacts.require(contractName);
  const contract = await Contract.deployed(...args);
  return contract;
}

async function getContractsFromExternalHost() {
  const token = await getContractFromExternalHost("MockToken");
  const tiramisuContract = await getContractFromExternalHost(
    "MockTiramisu",
    token.address
  );
  return {
    token: token.contract,
    tiramisuContract: tiramisuContract.contract
  };
}

function deployFromArtifact(tester, artifact, args) {
  const { abi, bytecode } = artifact;
  return new tester.web3.eth.Contract(abi)
    .deploy({ data: bytecode, arguments: args || [] })
    .send({
      from: tester.from,
      gas: 6e6
    });
}

async function deployContract(tester, contractName, args) {
  const artifact = require(`../build/contracts/${contractName}.json`);
  const contract = await deployFromArtifact(tester, artifact, args);
  return contract;
}

async function deployContracts(tester) {
  const token = await deployContract(tester, "MockToken", [
    5000,
    "Mock ERC20 Token",
    "MOCK"
  ]);
  const tiramisuContract = await deployContract(tester, "MockTiramisu", [
    token.options.address
  ]);
  return { token, tiramisuContract };
}

module.exports = {
  getContractFromExternalHost,
  getContractsFromExternalHost,
  deployContracts,
  deployContract
};
