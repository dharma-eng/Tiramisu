const solc = require("solc");
const path = require("path");
const fs = require("fs");

function toSource(dir, fileName) {
  let name = fileName.replace(".sol", ""); // works with either contract name or file name
  return {
    [`${name}.sol`]: {
      content: fs.readFileSync(path.resolve(dir, `${name}.sol`), "utf8")
    }
  };
}

export function compile(dir, fileName, importPath) {
  if (!importPath) importPath = dir;
  function findImports(_path) {
    let fP = _path.match(/\//g)
      ? path.resolve(importPath, _path)
      : path.resolve(dir, _path);
    // console.log(`Imported ${fP}`);
    if (fs.existsSync(fP)) return { contents: fs.readFileSync(fP, "utf8") };
    fP = _path.match(/\//g)
      ? path.resolve(dir, _path)
      : path.resolve(importPath, _path);
    if (fs.existsSync(fP)) return { contents: fs.readFileSync(fP, "utf8") };
    else return { error: "File not found" };
  }
  let sources = {};
  if (Array.isArray(fileName))
    for (let source of fileName)
      sources = { ...sources, ...toSource(dir, source) };
  else sources = toSource(dir, fileName);

  const input = {
    language: "Solidity",
    sources,
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.bytecode.linkReferences"]
        }
      }
    }
  };

  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: findImports })
  );
  if (output.errors) {
    for (let err of output.errors) {
      console.log(err);
    }
    throw new Error();
  }
  return output.contracts;
}