contract("Coverage Tests", accounts => {
  it("should be able to run coverage suite", async () => {
    const blockchainTest = require("./Blockchain.spec.js");
    blockchainTest();
  });
});
