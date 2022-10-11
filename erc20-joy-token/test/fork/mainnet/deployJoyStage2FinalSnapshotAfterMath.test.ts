import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'
import { Wallet, Contract } from 'ethers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { JoyToken, Presale } from '../../../typechain-types/contracts'
import { XJoyToken } from '../../../typechain-types'
import { impersonateAccount } from '../../../utils/impersonateAccount'
import { increaseTime } from '../../../utils/increaseTime'

const {
    pKowner,
    pKadmin,
    pKuser1,
    pKuser2,
    pKpool1,
    pKpool2,
    pKpool3,
    pKpool4,
    pKblacklisted,
    pKwhitelisted,
    pKwhitelisted2,
} = process.env

const toEth: Function = (value: string) => ethers.utils.parseEther(value).toString()
const signerWrapper = (privKey: string, provider: any) => new Wallet(privKey, provider)
const BN_From = (number: string | number) => ethers.BigNumber.from(number)

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')

let owner = signerWrapper(pKowner ?? '', provider)
let admin = signerWrapper(pKadmin ?? '', provider)
let user1 = signerWrapper(pKuser1 ?? '', provider)
let user2 = signerWrapper(pKuser2 ?? '', provider)
let user3 = signerWrapper(pKpool1 ?? '', provider)
let user4 = signerWrapper(pKpool2 ?? '', provider)
let pool3 = signerWrapper(pKpool3 ?? '', provider)
let pool4 = signerWrapper(pKpool4 ?? '', provider)
let blacklisted = signerWrapper(pKblacklisted ?? '', provider)
let whitelisted = signerWrapper(pKwhitelisted ?? '', provider)
let whitelisted2 = signerWrapper(pKwhitelisted2 ?? '', provider)

console.log('owner', owner.address)
console.log('admin', admin.address)
console.log('user1', user1.address)
console.log('user2', user2.address)
console.log('user3', user3.address)
console.log('user4', user4.address)
console.log('pool3', pool3.address)
console.log('pool4', pool4.address)
console.log('blacklisted', blacklisted.address)
console.log('whitelisted', whitelisted.address)
console.log('whitelisted2', whitelisted2.address)

interface JoySnapshot {
    address: string
    tokens: string
}

function fetchPlan(): Promise<JoySnapshot[]> {
    return new Promise(function (resolve, reject) {
        let results: JoySnapshot[] = []

        const coolPath = path.join(__dirname + '/../../../holders-all.csv')
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

describe('JoyV1 to JoyV2 Snapshot and Migration Deployment', async () => {
    let INITIAL_OWNER_ADDRESS: string = '0x5FBb6f67d9C359Ac30C5a276F362ef84Eb333cA6'
    let OWNER_ADDRESS: string = '0xAcD82F99Ccb15A81A4a440CE654eC335CBc1Dac6'
    let TREASURY_ADDRESS: string = '0xe24aB7eBE787A5077B8BBC344C70ff0b57545263'

    // (JOY, xJOY, Presale)
    let xJOY_ADDRESS: string = "0x592a74d0228999ea06010fdc4f954374289bc952"
    let JOY_ADDRESS: string = "0x4E114d405b9Ba2F59524941733e505Ae03Fb1FB5"
    let PRESALE_ADDRESS: string = "0x9c1db5a007ca710c8c17e538afc1ba96f2eab44c"

    let FACTORY_ADDRESS: string = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
    let ROUTER_ADDRESS: string = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
    let USDT_ADDRESS: string = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    let USDC_ADDRESS: string = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    let USDC: Contract
    let USDT: Contract
    let UNI_ROUTER: Contract
    let UNI_FACTORY: Contract
    let JOY_USDC_PAIR: Contract

    let xJoyToken: Contract
    let joyToken: Contract
    let presale: Contract

    let purchaser: Wallet
    let treasury: Wallet
    let multisigOwner: Wallet

    before(async () => {
        purchaser = await impersonateAccount(provider, "0x4BFC351246a22944B9ae98C56e77561bA3FD0da4")
        treasury = await impersonateAccount(provider, TREASURY_ADDRESS)
        multisigOwner = await impersonateAccount(provider, OWNER_ADDRESS)
        await impersonateAccount(provider, owner.address)
        await impersonateAccount(provider, admin.address)
        await impersonateAccount(provider, user1.address)
        await impersonateAccount(provider, user2.address)
        await impersonateAccount(provider, user3.address)
        await impersonateAccount(provider, user4.address)
        await impersonateAccount(provider, pool3.address)
        await impersonateAccount(provider, pool4.address)
        await impersonateAccount(provider, blacklisted.address)
        await impersonateAccount(provider, whitelisted.address)
        await impersonateAccount(provider, whitelisted2.address)

        xJoyToken = await ethers.getContractAt('XJoyToken', xJOY_ADDRESS, owner)
        joyToken = await ethers.getContractAt('JoyToken', JOY_ADDRESS, owner)
        presale = await ethers.getContractAt('Presale', PRESALE_ADDRESS, owner)
    })

    describe("JoyV2 Snapshot Migration", async () => {
        it("Should mint Tokens for 3.5K JOY Holders", async () => {
            console.log('joyToken.address', joyToken.address)
            console.log('xJoyToken.address', xJoyToken.address)
            console.log('presale.address', presale.address)
            console.log('await joyToken.owner()', await joyToken.owner())
        })
        
        // it("Should transfer Ownership From GNOSIS SAFE to Deployer Hot Wallet", async () => {
        //     console.log('await joyToken.owner()', await joyToken.owner())
        //     await joyToken.connect(multisigOwner).transferOwnership(owner.address);
        //     console.log('await joyToken.owner()', await joyToken.owner())
        // })
        // return

        it("Check last JOYV1 Holder Balance Before", async () => {
            console.log('balanceLastHolders:', await joyToken.balanceOf("0x9cdc00c3cf228100674e4d0000e732f78d004320"))
        })

        it("Check last JOYV1 Holder Balance After", async () => {
            console.log('balanceLastHolders:', await joyToken.balanceOf("0x9cdc00c3cf228100674e4d0000e732f78d004320"))
        })
    })

})
