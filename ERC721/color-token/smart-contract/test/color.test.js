const Color = artifacts.require("./Color.sol");

require("chai")
  .use(require("chai-as-promised"))
  .should()

contract("Color", (accounts) => {
  let contract;

  before(async () => {
    contract = await Color.deployed();
  })

  describe("deployment", async () => {
    it("deploys successfully", async () => {
      const address = contract.address;
      assert.notEqual(address, 0x0);
      assert.notEqual(address, "");
      assert.notEqual(address, null);
      assert.notEqual(address, undefined);
    })

    it("has correct name", async () => {
      const name = await contract.name();
      assert.equal(name, "Color");
    })

    it("has a symbol", async () => {
      const symbol = await contract.symbol();
      assert.equal(symbol, "COLOR");
    })
  })

  describe("minting", async () => {
    it("creates a new token", async () => {
      const result = await contract.mint("#EC058E");
      const totalSupply = await contract.totalSupply();
      //SUCCESS
      assert.equal(totalSupply, 1);
      // console.log(result);
      const event = result.logs[0].args;
      // console.log(event);
      assert.equal(event.tokenId.toNumber(), 1, "id is correct");
      assert.equal(event.from, "0x0000000000000000000000000000000000000000", "from is correct");
      assert.equal(event.to, accounts[0], "to is correct");

      //FAILURE: Cannot mint same color twice
      await contract.mint("#EC058E").should.be.rejected;
    })
  })

  describe("indexing", async () => {
    it("lists colors", async () => {
      //Mint 3 more tokens
      await contract.mint("#5386E4");
      await contract.mint("#FFFFFF");
      await contract.mint("#000000");
      const totalSupply = await contract.totalSupply();

      let color;
      let result = [];

      for (let i = 0; i < totalSupply; i++) {
        color = await contract.colors(i);
        result.push(color);
      }

      let expected = ["#EC058E", "#5386E4", "#FFFFFF", "#000000"];
      assert.equal(result.join(), expected.join());
    })
  })
})