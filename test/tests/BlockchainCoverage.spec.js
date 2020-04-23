const blockchainTest = require("../../dist-test/test/tests/Blockchain.spec")
  .default;

contract("Coverage Tests", accounts => {
  it("should be able to run coverage suite", async () => {
    blockchainTest();
  });
});
