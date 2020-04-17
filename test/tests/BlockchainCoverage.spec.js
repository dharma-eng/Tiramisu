const MockDharmaDai = artifacts.require("MockDharmaDai");
const MockDharmaPeg = artifacts.require("MockDharmaPeg");

contract("Coverage Tests", accounts => {
  it("should be able to run coverage suite", async () => {
    const MockDharmaDaiInstance = await MockDharmaDai.deployed();
    const MockDharmaPegInstance = await MockDharmaDai.deployed(
      MockDharmaDaiInstance.address
    );

    require("./Blockchain.spec.js");

    return [MockDharmaDaiInstance, MockDharmaPegInstance];
  });
});
