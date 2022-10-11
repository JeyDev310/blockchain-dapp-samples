const deployFunction = async ({ getNamedAccounts, deployments, ethers, upgrades }) => {
  const { deploy } = deployments;
  const { root } = await getNamedAccounts();
  const isUpgrading = false;

  const Contract = await ethers.getContractFactory("FundShare");
  if (isUpgrading) {
    console.log('FundShare upgrading...');
    const proxyAddress = "0x6baAed676a5E2cCCCF43f3d732244314E1dba7c5";
    const contract = await upgrades.upgradeProxy( proxyAddress, Contract);
    console.log('FundShare tx:', contract.deployTransaction.hash);
    await contract.deployed();
    console.log('FundShare address:', contract.address);
  } else {
    console.log('FundShare deploying...');
    const contract = await upgrades.deployProxy(
      Contract,
      [],
      { initializer: 'initialize' }
    );
    console.log('FundShare tx:', contract.deployTransaction.hash);
    await contract.deployed();
    console.log('FundShare address:', contract.address);

    // console.log('xJOY Token verifying...');
    // const address = "0xAd53534f06c2466A79a09c79BcB80bA211bB3edf";
    // await run("verify:verify", {
    //   address,
    //   constructorArguments: [],
    //   contract: "contracts/token/XJoyToken.sol:XJoyToken"
    // })
  }
};

module.exports = deployFunction;
module.exports.tags = ["FundShare"];


// ***** Deploying *****
// npx hardhat deploy --network mainnet --tags FundShare
// npx hardhat deploy --network ropsten --tags FundShare
// npx hardhat deploy --network rinkeby --tags FundShare

// rinkeby: 0x0908546254a6d9Af1eebd7a59c270Db539a329Cc
// ropsten: 0xd439CBEF2e6900534e7dDCC5593E82285229815A
// mainnet: 0x20A13cc4A2b51c327E824568F067c46fA372ce56

// ***** Verifying *****
// npx hardhat verify --network rinkeby 0xa1468573E7Ac65ac4540155499C9c816a994bAFA
// npx hardhat verify --network ropsten 0xe91fA837b9CA618F89758D06D4149730AA64d7aa