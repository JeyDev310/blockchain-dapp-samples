import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'
import { ethers } from "hardhat";
import { JoyToken, Presale } from '../typechain-types/contracts'
import { XJoyToken } from '../typechain-types'
const BN_From = (number: string | number) => ethers.BigNumber.from(number)

interface JoySnapshot {
  address: string
  tokens: string
}

function fetchPlan(): Promise<JoySnapshot[]> {
  return new Promise(function (resolve, reject) {
    let results: JoySnapshot[] = []

    const coolPath = path.join(__dirname + '/../holders_all_test_final_burnable.csv')
    fs.createReadStream(coolPath)
      .pipe(csv())
      .on('data', (data) => {
        results.push({
          address: data['Address'],
          tokens: data['Tokens'],
        })
      })
      .on('end', () => {
        resolve(results)
      })
  })
}

async function main() {
  const [owner] = await ethers.getSigners();
  console.log('owner.address', owner.address);
  console.log("ETH balance:", (await owner.getBalance()).toString());

  // (JOY, xJOY, Presale)
  let joyToken: JoyToken
  let xJoyToken: XJoyToken
  let presale: Presale

  let HOT_WALLET = '0x5FBb6f67d9C359Ac30C5a276F362ef84Eb333cA6'
  let HOT_WALLET_MIGRATOR = '0x317FcB85Fa0dd02BeE45B309936006DF2B82546b'
  let JOY_V2_GNOSIS_SAFE_OWNER = '0xAcD82F99Ccb15A81A4a440CE654eC335CBc1Dac6'
  let JOY_V2_GNOSIS_SAFE_OTC = '0xe24aB7eBE787A5077B8BBC344C70ff0b57545263'
  let JOY_V2_GNOSIS_SAFE_LP_WALLET = '0x68eff6a8795c62fD41388a0306Bf7C9BF7E191db'

  let JOY_ADDRESS = "0x4E114d405b9Ba2F59524941733e505Ae03Fb1FB5"
  let xJOY_ADDRESS = "0x592a74d0228999ea06010fdc4f954374289bc952"
  let PRESALE_ADDRESS = "0x9c1db5a007ca710c8c17e538afc1ba96f2eab44c"

  let ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

  joyToken = await ethers.getContractAt('JoyToken', JOY_ADDRESS, owner)
  xJoyToken = await ethers.getContractAt('XJoyToken', xJOY_ADDRESS, owner)
  presale = await ethers.getContractAt('Presale', PRESALE_ADDRESS, owner)
  // (JOY, xJOY, Presale)

  // STEP 1 - GNOSIS
  // await joyToken.connect(multisigOwner).addAdmin(owner.address)
  // await joyToken.connect(multisigOwner).transferOwnership(owner.address)

  // STEP 2: BURN 
  // let addresses: string[] = []
  // let tokens: string[] = []

  // let plan = await fetchPlan()
  // console.log('plan', plan)

  // plan.forEach((p) => {
  //   addresses.push(p.address)
  //   tokens.push(ethers.utils.parseEther(p.tokens).toString())
  // })

  // for (let i = 0; i < plan.length; i++) {
  //   await joyToken.connect(owner).burn(addresses[i], tokens[i])
  // }

  // STEP 3
  await joyToken.connect(owner).removeFromWhitelist(JOY_V2_GNOSIS_SAFE_LP_WALLET)
  await joyToken.connect(owner).removeAdmin(PRESALE_ADDRESS)
  await joyToken.connect(owner).removeAdmin(JOY_V2_GNOSIS_SAFE_OTC)

  // STEP 4
  await joyToken.connect(owner).removeAdmin(JOY_V2_GNOSIS_SAFE_OWNER)
  await joyToken.connect(owner).transferOwnership(JOY_V2_GNOSIS_SAFE_OWNER)
  await joyToken.connect(owner).removeAdmin(owner.address)

  // it('Test removing admin from HOT WALLET', async () => {
  //     await joyToken.connect(owner).removeFromWhitelist(JOY_V2_LP_GNOSIS)
  //     await joyToken.connect(owner).removeAdmin(PRESALE_ADDRESS)
  //     await joyToken.connect(owner).removeAdmin(TREASURY_ADDRESS)
  //     await joyToken.connect(owner).removeAdmin(OWNER_ADDRESS)
  //     await joyToken.connect(owner).transferOwnership(OWNER_ADDRESS)
  //     await joyToken.connect(owner).removeAdmin(owner.address)
  // })

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
