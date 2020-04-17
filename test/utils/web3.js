const Web3 = require("web3");
const ganache = require("ganache-core");

async function getWeb3() {
  let usingExternalHost = true;
  let web3 = new Web3(
    new Web3.providers.WebsocketProvider("ws://localhost:8555")
  );
  await web3.eth.net.isListening().catch(() => {
    web3 = new Web3(ganache.provider());
    usingExternalHost = false;
  });
  const accounts = await web3.eth.getAccounts();
  const [from] = accounts;
  const networkID = await web3.eth.net.getId();
  return {
    accounts,
    from,
    web3,
    usingExternalHost,
    networkID
  };
}

const contractFields = ({
  abi,
  evm: {
    bytecode: { object: bytecode, linkReferences }
  }
}) => ({ abi, bytecode, linkReferences });

const toContractFields = (options, file, name) =>
  contractFields(options.contracts[file][name]);

const toLinkKey = (fileRef, contractRef) => `${fileRef}:${contractRef}`;
const fromLinkKey = key => key.split(":");

const linker = require("solc/linker");
// function getLinkContract(contracts, linkKey) {
//   const [fileRef, contractRef] = fromLinkKey(linkKey);
//   return contractFields(contracts[fileRef][contractRef]);
// }

// function parseLinkReferences(linkReferences) {
//   const fileRefKeys = Object.keys(linkReferences);
//   return fileRefKeys.map(fileRef =>
//     Object.keys(linkReferences[fileRef]).map(contractRef =>
//       toLinkKey(fileRef, contractRef)
//     )
//   )
// }

// function getLinkReferencesRecursive(linkReferences, contracts) {
//   /* fileRef/contractRef -> [fileRef/contractRef, ...] */
//   const linkRefsCode = {
//     /* linkKey: {abi, bytecode} */
//   }
//   const linkRefsMap = {
//     /* linkKey: [linkKey, linkKey] */
//   }
//   const links = parseLinkReferences(linkReferences);
//   for (let linkKey of links) {
//     const { abi, bytecode, linkReferences } = getLinkContract(contracts, linkKey);
//   }

//   if (linkReferences) {
//     const fileRefKeys = Object.keys(linkReferences);
//     let addrMap = {};
//     for (let fileRef of fileRefKeys) {
//       const contractRefKeys = Object.keys(contracts[fileRef])
//       for (let contractRef of contractRefKeys) {
//         const key = toLinkKey(fileRef, contractRef);
//         const { linkReferences } =
//         linkRefsMap[key] =
//         if (deployments[fileRef][contractRef]) addrMap[fileRef][contractRef] = deployments[fileRef][contractRef];
//         else {
//           let addr = await deployAndLinkRecursive({ web3, from, deployments, file: fileRef, contract: contractRef, options })
//           if (typeof addr == 'object') addr = addr.options.address;
//           // await deploy(web3, from, options)
//           deployments[fileRef][contractRef] = addr;
//           addrMap[fileRef][contractRef] = addr;
//         }
//       }
//     }
//   }
// }
async function deployAndLinkRecursive(
  { web3, from, deployments, file, contract, options },
  returnData
) {
  deployments = deployments || {};

  let { abi, bytecode, linkReferences } = toContractFields(
    options,
    file,
    contract
  );
  if (linkReferences) {
    const fileRefKeys = Object.keys(linkReferences);
    let addrMap = {};
    for (let fileRef of fileRefKeys) {
      addrMap[fileRef] = {};
      if (!deployments[fileRef]) deployments[fileRef] = {};
      const contractRefKeys = Object.keys(options.contracts[fileRef]);
      for (let contractRef of contractRefKeys) {
        if (deployments[fileRef][contractRef])
          addrMap[fileRef][contractRef] = deployments[fileRef][contractRef];
        else {
          let addr = await deployAndLinkRecursive({
            web3,
            from,
            deployments,
            file: fileRef,
            contract: contractRef,
            options
          });
          if (typeof addr == "object") addr = addr.options.address;
          // await deploy(web3, from, options)
          deployments[fileRef][contractRef] = addr;
          addrMap[fileRef][contractRef] = addr;
        }
      }
    }
    bytecode = linker.linkBytecode(bytecode, addrMap);
  }
  if (returnData) return bytecode;
  return deploy(web3, from, { abi, bytecode });
}

async function deploy(web3, from, options, _arguments = null) {
  let abi, bytecode, value, args;

  value = options.value || 0;

  if (_arguments) args = _arguments;
  else if (options.arguments) args = options.arguments;

  if (typeof options == "string") bytecode = options;
  else if (options.abi || options.bytecode) {
    abi = options.abi;
    bytecode = options.bytecode;
  } else if (options.contracts) {
    let fileRef, contractRef;
    if (options.name) fileRef = `${options.name.replace(".sol", "")}.sol`;
    else if (Object.keys(options.contracts).length == 1) {
      fileRef = Object.keys(options.contracts)[0].replace(".sol", "");
    } else throw new Error("contracts option given without name");
    if (!options.contracts[fileRef])
      throw new Error(`${fileRef} not found in contracts`);

    if (options.contracts[fileRef][options.name]) contractRef = options.name;
    else if (Object.keys(options.contracts[fileRef]).length == 1)
      contractRef = Object.keys(options.contracts[fileRef])[0];
    else throw new Error(`Could not find contract in ${fileRef}`);

    let { linkReferences, abi: _abi, bytecode: _bytecode } = toContractFields(
      options,
      fileRef,
      contractRef
    );
    if (Object.keys(linkReferences).length) {
      bytecode = await deployAndLinkRecursive(
        { web3, from, file: fileRef, contract: contractRef, options },
        true
      );
    } else bytecode = _bytecode;
    abi = _abi;
  }

  if (!bytecode) throw new Error("Unable to retrieve bytecode from options");
  if (bytecode.slice(0, 2) != "0x") bytecode = `0x${bytecode}`;

  if (abi)
    return new web3.eth.Contract(abi)
      .deploy({ data: bytecode, arguments: args || [] })
      .send({ from, gas: 6e6, value });
  const { contractAddress } = await web3.eth.sendTransaction({
    from,
    gas: 6e6,
    data: bytecode,
    value
  });
  return contractAddress;
}

module.exports = {
  getWeb3,
  deploy
};
