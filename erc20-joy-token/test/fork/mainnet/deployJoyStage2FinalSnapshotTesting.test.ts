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

const { pKowner, pKadmin, pKuser1, pKuser2 } = process.env

const toEth: Function = (value: string) => ethers.utils.parseEther(value).toString()
const signerWrapper = (privKey: string, provider: any) => new Wallet(privKey, provider)
const BN_From = (number: string | number) => ethers.BigNumber.from(number)

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')

let owner = signerWrapper(pKowner ?? '', provider)
let admin = signerWrapper(pKadmin ?? '', provider)
let user1 = signerWrapper(pKuser1 ?? '', provider)
let user2 = signerWrapper(pKuser2 ?? '', provider)
console.log('owner', owner.address)
console.log('admin', admin.address)
console.log('user1', user1.address)
console.log('user2', user2.address)

interface JoySnapshot {
    address: string
    tokens: string
}

function fetchPlan(): Promise<JoySnapshot[]> {
    return new Promise(function (resolve, reject) {
        let results: JoySnapshot[] = []

        const coolPath = path.join(__dirname + '/../../../holders-all_test_final.csv')
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
    let INITIAL_MIGRATOR_CONTRACT_DEPLOYER: string = '0x317FcB85Fa0dd02BeE45B309936006DF2B82546b'
    let INITIAL_OWNER_ADDRESS: string = '0x5FBb6f67d9C359Ac30C5a276F362ef84Eb333cA6'
    let OWNER_ADDRESS: string = '0xAcD82F99Ccb15A81A4a440CE654eC335CBc1Dac6'
    let TREASURY_ADDRESS: string = '0xe24aB7eBE787A5077B8BBC344C70ff0b57545263'

    // (JOY, xJOY, Presale)
    let xJOY_ADDRESS: string = "0x592a74d0228999ea06010fdc4f954374289bc952"
    let JOY_ADDRESS: string = "0x4E114d405b9Ba2F59524941733e505Ae03Fb1FB5"
    let PRESALE_ADDRESS: string = "0x9c1db5a007ca710c8c17e538afc1ba96f2eab44c"

    // 0xe8e337000000000000000000000000004e114d405b9ba2f59524941733e505ae03fb1fb5000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000008ac7230489e80000000000000000000000000000000000000000000000000000000000000098968000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb9226600000000000000000000000000000000000000000000000000000000633dc13c

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
        multisigOwner = await impersonateAccount(provider, INITIAL_OWNER_ADDRESS)
        await impersonateAccount(provider, owner.address)
        await impersonateAccount(provider, admin.address)
        await impersonateAccount(provider, user1.address)
        await impersonateAccount(provider, user2.address)

        xJoyToken = await ethers.getContractAt('XJoyToken', xJOY_ADDRESS, owner)
        joyToken = await ethers.getContractAt('JoyToken', JOY_ADDRESS, owner)
        presale = await ethers.getContractAt('Presale', PRESALE_ADDRESS, owner)

        const factory = await ethers.getContractAt(
            'IUniswapFactory',
            FACTORY_ADDRESS,
            owner
        )
        UNI_FACTORY = factory

        const router = await ethers.getContractAt(
            'IUniswapRouter02',
            ROUTER_ADDRESS,
            owner
        )
        UNI_ROUTER = router

        await factory.createPair(joyToken.address, USDC_ADDRESS)

        // JOY_USDC_PAIR = await ethers.getContractAt('IUniswapV2Pair', SWAP_PAIR, owner)
        // console.log('JOY_USDC_PAIR.address', JOY_USDC_PAIR.address)

        USDC = await ethers.getContractAt('IWETH', USDC_ADDRESS, owner)
    })

    // [] JOYSTICK V2 REPO WITH OZ MATCHING LATEST VERSION - https://github.com/Joystick-Gaming-IO/JG-SC
    // [] 6. Transfer Ownership to Deployer Hot Wallet from Gnosis Safe Owner Wallet
    // [] 7. joyToken.addManyToWhitelist(Hot_Wallet_Address, V2_LP_Holder_Address, ADDRESS_ZERO)
    // [] 8. setTransferMode(2) to block all transfers except from whitelisted Gnosis Safe, Hot Wallet and ADDRESS_ZERO
    // [] 10. Add initial liquidity for JoyV2/USDC Pair and set initial valuation
    // [] 11. Snapshot all JoyV1 Holders 
    //   + all 5 JoyTokenV1 LP Holders using Pauls Scripts
    //   + all extra 180 custom addressess to split 4.8B JoyV1 Treasury Address
    //   + Mint JoyTokenV2 for LP V2 Gnosis Wallet
    // [] 12. Mint JoyTokenV2 matching JoyV1 Token Holders Balances using joyToken.mintMany()
    // [] 13. JoyV2 Start Sale
    // [] 14. JoyV2 Enable MEV Protection
    // [] 15. Remove Whitelist (Hot_Wallet, V2_LP_Holder and ADDRESS_ZERO)
    // [] 16. Transfer Ownership back to Gnosis Safe Owner Wallet

    describe("JoyV2 Snapshot Migration", async () => {
        it("Should whitelist only FROM address to do things", async () => {
            await expect(joyToken.connect(multisigOwner).addManyToWhitelist([owner.address, owner.address, "0x0000000000000000000000000000000000000000"])).to.emit(joyToken, "WhitelistedMany");
            // await expect(joyToken.connect(multisigOwner).addToWhitelist(UNI_FACTORY.address)).to.emit(joyToken, "Whitelisted");
            // await expect(joyToken.connect(multisigOwner).addToWhitelist(UNI_ROUTER.address)).to.emit(joyToken, "Whitelisted");
            // await expect(joyToken.connect(multisigOwner).addToWhitelist(owner.address)).to.emit(joyToken, "Whitelisted");
            // await expect(joyToken.connect(multisigOwner).addToWhitelist(joyToken.address)).to.emit(joyToken, "Whitelisted");
            // await expect(joyToken.connect(multisigOwner).addToWhitelist(USDC.address)).to.emit(joyToken, "Whitelisted");

            // const SWAP_PAIR = await UNI_FACTORY.getPair(joyToken.address, USDC_ADDRESS)
            // console.log('SWAP_PAIR.address', SWAP_PAIR)

            // JOY_USDC_PAIR = await ethers.getContractAt('IUniswapV2Pair', SWAP_PAIR, owner)
            // console.log('JOY_USDC_PAIR.address', JOY_USDC_PAIR.address)

            // await expect(joyToken.connect(multisigOwner).addToWhitelist(SWAP_PAIR)).to.emit(joyToken, "Whitelisted");

            console.log('whitelisted owner address?', await joyToken.whitelisted(owner.address))
            console.log('blacklisted owner address?', await joyToken.blacklisted(owner.address))
        })

        // it("Should change setTransferMode to 2", async () => {
        //     await expect(joyToken.connect(multisigOwner).setTransferMode(2)).not.to.be.reverted
        //     console.log("transferMode", await joyToken.transferMode());
        // })

        // it("Should transfer Ownership From GNOSIS SAFE to Deployer Hot Wallet", async () => {
        //     console.log('await joyToken.owner()', await joyToken.owner())
        //     await joyToken.connect(multisigOwner).transferOwnership(owner.address);
        //     console.log('await joyToken.owner()', await joyToken.owner())
        // })

        // it("Should not allow unwhitelisted address to make transfers", async () => {
        //     await expect(joyToken.connect(owner).mint(owner.address, toEth('1000'))).not.to.be.reverted
        //     await expect(joyToken.connect(owner).mint(user1.address, toEth('100'))).not.to.be.reverted
        // })

        it("Check last JOYV1 Holder Balance Before", async () => {
            console.log('balanceLastHolders:', await joyToken.balanceOf("0x9cdc00c3cf228100674e4d0000e732f78d004320"))
        })

        it("Should mint Tokens for 3.5K JOY Holders", async () => {

            // ADD PURCHASERS
            let addresses: string[] = []
            let tokens: string[] = []

            let plan = await fetchPlan()
            // console.log('plan', plan)

            plan.forEach((p) => {
                addresses.push(p.address)
                tokens.push(ethers.utils.parseEther(p.tokens).toString())
            })

            let zzz = 0;
            let xxx = 0;

            // We need to splice it so
            while (true) {
                if (addresses.length > 91) {
                    let addr = addresses.splice(0, 91)
                    let depos = tokens.splice(0, 91)
                    // console.log('addr, depos', addr, depos)
                    zzz += 1;
                    console.log('zzz inside', zzz)
                    await joyToken.connect(multisigOwner).mintMany(addr, depos)
                    console.log('await joyToken.totalSupply()', await joyToken.totalSupply());
                    // return; // remove this in production
                } else {
                    console.log('addresses, tokens', addresses, tokens)
                    xxx += 1;
                    console.log('xxx inside', xxx)
                    await joyToken.connect(multisigOwner).mintMany(addresses, tokens)
                    console.log('await joyToken.totalSupply()', await joyToken.totalSupply());
                    break
                }
            }

            console.log('zzz', zzz)
            console.log('xxx', xxx)
            
            expect(true)
        })

        // it("Should create Pair and Add initial valuation", async () => {
        //     const block = await ethers.provider.getBlock('latest')
        //     const deadline = Math.floor(block.timestamp) // now + 1 minute

        //     await USDC.connect(owner).approve(UNI_ROUTER.address, 20 * 1e6)
        //     await joyToken.connect(owner).approve(UNI_ROUTER.address, toEth('20'))

        //     console.log('balance owner to JOY to router', await joyToken.balanceOf(owner.address))
        //     console.log('balance owner to USDC to router', await USDC.balanceOf(owner.address))

        //     console.log('allowance owner to JOY to router', await joyToken.allowance(owner.address, UNI_ROUTER.address))
        //     console.log('allowance owner to USDC to router', await USDC.allowance(owner.address, UNI_ROUTER.address))

        //     const tx = await UNI_ROUTER.connect(owner).addLiquidity(
        //         joyToken.address, // address tokenA,
        //         USDC_ADDRESS,     // address tokenB,
        //         toEth('10'),      // uint256 amountADesired,
        //         10 * 1e6,         // uint256 amountBDesired,
        //         toEth('10'),      // usdcAddress
        //         10 * 1e6,         // receiver
        //         owner.address,    // address to,
        //         deadline + 60,    // uint256 deadline
        //     );
        //     await tx.wait();

        //     // const swap1 = await UNI_ROUTER.connect(owner).swapExactTokensForTokens(
        //     //     toEth('0.1'),
        //     //     0,
        //     //     [joyToken.address, USDC.address],
        //     //     owner.address,
        //     //     deadline + 10
        //     // )
        //     // await swap1.wait()

        //     console.log('ran after JOY USDC PAIR')
        // })

        it("Check last JOYV1 Holder Balance After", async () => {
            console.log('balanceLastHolders:', await joyToken.balanceOf("0x9cdc00c3cf228100674e4d0000e732f78d004320"))

            console.log('Get TotalSupply', await joyToken.totalSupply())
            expect(true)
        })

    })

})
