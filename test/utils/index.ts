module.exports = {
  compile: require("./compile"),
  ...require("./web3"),
  ...require("./random")
};

export * from './compile';
export * from './random';