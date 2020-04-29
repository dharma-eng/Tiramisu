const blockchainTest = require("../../dist-test/test/tests/Blockchain.spec")
  .default;
const fraudProofsTest = require("../../dist-test/test/tests/fraud-proofs/index.spec")
  .default;

contract("Coverage Tests", accounts => {
  it("should be able to run coverage suite", async () => {
    blockchainTest();
    fraudProofsTest();
  });
});
