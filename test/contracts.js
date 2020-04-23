async function getContractFromExternalHost(contractName, ...args) {
  const Contract = artifacts.require(contractName);
  const contract = await Contract.deployed(...args);
  return contract;
}

async function getContractsFromExternalHost() {
  const dai = await getContractFromExternalHost("MockDharmaDai");
  const peg = await getContractFromExternalHost("MockDharmaPeg", dai.address);
  return {
    dai: dai.contract,
    peg: peg.contract
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
  const dai = await deployContract(tester, "MockDharmaDai", [
    5000,
    "DharmaDai",
    "DDAI"
  ]);
  const peg = await deployContract(tester, "MockDharmaPeg", [
    dai.options.address
  ]);
  return { dai, peg };
}

module.exports = {
  getContractFromExternalHost,
  getContractsFromExternalHost,
  deployContracts,
  deployContract
};
