import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'
import { Wallet, Contract } from 'ethers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { JoyToken, Presale } from '../../../typechain-types/contracts'
import { XJoyToken } from '../../../typechain-types'
import { increaseTime } from '../../../utils/increaseTime'
import { impersonateAccount } from '../../../utils/impersonateAccount'

const toEth: Function = (value: string) => ethers.utils.parseEther(value).toString()
const signerWrapper = (privKey: string, provider: any) => new Wallet(privKey, provider)
const BN_From = (number: string | number) => ethers.BigNumber.from(number)

const { pKowner, ALCHEMY_MAINNET } = process.env
// const provider = new ethers.providers.JsonRpcProvider(ALCHEMY_MAINNET)
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')

let owner = signerWrapper(pKowner ?? '', provider)
console.log('owner', owner.address)

interface VestingPlan {
    address: string
    deposited: string
    tokens: string
    timestamp: string
    schedule: string
}

function fetchPlan(): Promise<VestingPlan[]> {
    return new Promise(function (resolve, reject) {
        let results: VestingPlan[] = []

        const coolPath = path.join(__dirname + '../../../../vesting_plan_new.csv')
        fs.createReadStream(coolPath)
            .pipe(csv())
            .on('data', (data) => {
                results.push({
                    address: data['Address'],
                    deposited: data['Deposited'],
                    tokens: data['Tokens'],
                    timestamp: data['Timestamp'],
                    schedule: data['Vesting Schedule'],
                })
            })
            .on('end', () => {
                resolve(results)
            })
    })
}

describe('Deploying Joy, xJoy, Presale V2', async () => {
    let joyToken: JoyToken
    let xJoyToken: XJoyToken
    let presale: Presale

    // (JOY, xJOY, Presale)
    let INITIAL_OWNER_ADDRESS: string = '0x5FBb6f67d9C359Ac30C5a276F362ef84Eb333cA6'
    let OWNER_ADDRESS: string = '0xAcD82F99Ccb15A81A4a440CE654eC335CBc1Dac6'
    let TREASURY_ADDRESS: string = '0xe24aB7eBE787A5077B8BBC344C70ff0b57545263'

    let xJOY_ADDRESS: string = "0x592a74d0228999ea06010fdc4f954374289bc952"
    let JOY_ADDRESS: string = "0x4E114d405b9Ba2F59524941733e505Ae03Fb1FB5"
    let PRESALE_ADDRESS: string = "0x9c1db5a007ca710c8c17e538afc1ba96f2eab44c"
    
    const thirtyDays = 2592000
    const oneDay = 86400

    let multisigOwner: Wallet

    describe('Basic Setup', async () => {
        it('Joy, xJoy, Presale Setup', async () => {
            await impersonateAccount(provider, owner.address)
            multisigOwner = await impersonateAccount(provider, OWNER_ADDRESS)

            xJoyToken = await ethers.getContractAt('XJoyToken', xJOY_ADDRESS, owner)
            joyToken = await ethers.getContractAt('JoyToken', JOY_ADDRESS, owner)
            presale = await ethers.getContractAt('Presale', PRESALE_ADDRESS, owner)

            await presale.connect(multisigOwner).changeOwnership(owner.address);
        });

        it('Add xJoy purchasers V2', async () => {

            let addresses: string[] = []
            let deposits: Presale.DepositInfoStruct[] = []

            let plan = await fetchPlan()
            // console.log('plan', plan)

            plan.forEach((p) => {
                addresses.push(p.address)
                deposits.push({
                    vestingType: BN_From(p.schedule),
                    depositedAmount: ethers.utils.parseEther(p.deposited),
                    purchasedAmount: ethers.utils.parseEther(p.tokens),
                    depositTime: BN_From(p.timestamp),
                })
            })

            let zzz = 0;
            let xxx = 0;

            // We need to splice it so
            while (true) {
                if (addresses.length > 100) {
                    let addr = addresses.splice(0, 100)
                    let depos = deposits.splice(0, 100)
                    zzz += 1;
                    console.log('addr, depos, true', addr, depos, true)
                    await presale.connect(owner).addPurchasers(addr, depos, true)
                } else {
                    // console.log('addresses, deposits, true', addresses, deposits, true)
                    xxx += 1;
                    console.log('addresses, deposits, true', addresses, deposits, true)
                    await presale.connect(owner).addPurchasers(addresses, deposits, true)
                    break
                }
            }

            console.log('zzz', zzz)
            console.log('xxx', xxx)
        })

        it('Test things work correctly', async () => {
            console.log('await presale.totalPurchasers()', await presale.totalPurchasers())
            console.log('await presale.purchaserAddress(0)', await presale.purchaserAddress(0))
            console.log('await presale.purchaserAddress(1)', await presale.purchaserAddress(1))
            console.log('await presale.purchaserAddress(331)', await presale.purchaserAddress(331))
            console.log('await presale.purchaserAddress(356)', await presale.purchaserAddress(356))
            console.log('await presale.purchaserAddress(357)', await presale.purchaserAddress(357))
        });

        it('Test if owner and admin are transferred correctly', async () => {
            console.log('await joyToken.address', await joyToken.address)
            console.log('await xJoyToken.address', await xJoyToken.address)
            console.log('await presale.address', await presale.address)

            console.log('await presale.hasRole(DEFAULT_ADMIN_ROLE, owner.address)', await presale.hasRole(await presale.DEFAULT_ADMIN_ROLE(), owner.address))
            console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)', await joyToken.hasRole(await presale.DEFAULT_ADMIN_ROLE(), owner.address))
            console.log('await xJoyToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)', await xJoyToken.hasRole(await presale.DEFAULT_ADMIN_ROLE(), owner.address))

            console.log('await joyToken.owner()', await joyToken.owner())
            console.log('await xJoyToken.owner()', await xJoyToken.owner())
            console.log('await presale.owner()', await presale.owner())
            console.log('await presale.swapGuarded()', await joyToken.swapGuarded())
            console.log('await presale.sale()', await presale.sale())
            // ADD PURCHASERS
        });

        it('Test things work correctly at the end', async () => {
            console.log('await presale.totalPurchasers()', await presale.totalPurchasers())
            console.log('await presale.purchaserAddress(0)', await presale.purchaserAddress(0))
            console.log('await presale.purchaserAddress(1)', await presale.purchaserAddress(1))
            console.log('await presale.purchaserAddress(331)', await presale.purchaserAddress(331))
            console.log('await presale.purchaserAddress(356)', await presale.purchaserAddress(356))
            console.log('await presale.purchaserAddress(357)', await presale.purchaserAddress(357))
        });

    })

})
