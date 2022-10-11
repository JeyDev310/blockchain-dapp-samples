import { ethers } from "hardhat";
import { Contract } from 'ethers'

async function main() {
  const [owner] = await ethers.getSigners();
  console.log('owner.address', owner.address);
  console.log("ETH balance:", (await owner.getBalance()).toString());
  
  // DEPLOY MIGRATOR CONTRACT
  let MIGRATOR: Contract;
  let Migrator = await ethers.getContractFactory('JOY_Migrator')
  MIGRATOR = await Migrator.connect(owner).deploy()
  await MIGRATOR.deployed()

  console.log("MIGRATOR ADDRESS:", MIGRATOR.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
