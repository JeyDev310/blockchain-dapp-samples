import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'
import { Wallet, Contract } from 'ethers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { JoyToken, Presale } from '../../../typechain-types/contracts'
import { XJoyToken } from '../../../typechain-types'
import { increaseTime } from '../../../utils/increaseTime'

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

        const coolPath = path.join(__dirname + '../../../../vesting_plan_final.csv')
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

    const thirtyDays = 2592000
    const oneDay = 86400

    describe('Basic Setup', async () => {
        it('Joy, xJoy, Presale Setup', async () => {
            let XJoyTokenF = await ethers.getContractFactory('XJoyToken')
            xJoyToken = await XJoyTokenF.connect(owner).deploy(
                [],                                     // whitelist
                [],                                     // blacklist
                [OWNER_ADDRESS, TREASURY_ADDRESS],      // admins
                true,                                   // guard
                ethers.utils.parseEther('2050000000')   // 2.05B xJoy
            )
            await xJoyToken.deployed()
    
            let JoyTokenF = await ethers.getContractFactory('JoyToken')
            joyToken = await JoyTokenF.connect(owner).deploy(
                [],                                // whitelist
                [],                                // blacklist
                [OWNER_ADDRESS, TREASURY_ADDRESS]  // admin
            )
            await joyToken.deployed()
    
            let Presale = await ethers.getContractFactory('Presale')
            presale = await Presale.connect(owner).deploy(
                joyToken.address,
                xJoyToken.address,
                [
                    // SEED
                    {
                        releasePercentBasisPoints: 250, // 2.5%
                        cliff: BN_From(thirtyDays).mul(BN_From(8)), // 8 months
                        releaseStep: BN_From(thirtyDays), // 30 days
                        vestingCloseTimeline: BN_From(thirtyDays).mul(BN_From(40)), // 40 months
                    },
                    // PRESALE
                    {
                        releasePercentBasisPoints: 250,
                        cliff: BN_From(thirtyDays).mul(BN_From(8)),
                        releaseStep: BN_From(thirtyDays),
                        vestingCloseTimeline: BN_From(thirtyDays).mul(BN_From(40)),
                    },
                    // TEAM
                    {
                        releasePercentBasisPoints: 250,
                        cliff: BN_From(thirtyDays).mul(BN_From(10)),
                        releaseStep: BN_From(thirtyDays),
                        vestingCloseTimeline: BN_From(thirtyDays).mul(BN_From(40)),
                    },
                    // PARTNERS
                    {
                        releasePercentBasisPoints: 250,
                        cliff: BN_From(thirtyDays).mul(BN_From(12)),
                        releaseStep: BN_From(thirtyDays),
                        vestingCloseTimeline: BN_From(thirtyDays).mul(BN_From(40)),
                    },
                    // DISCOUNT 55%
                    {
                        releasePercentBasisPoints: 13,
                        cliff: BN_From(thirtyDays).mul(BN_From(12)),
                        releaseStep: BN_From(oneDay),
                        vestingCloseTimeline: BN_From(oneDay).mul(BN_From(730)),
                    },
                ],
                4,
                TREASURY_ADDRESS
            )
            await presale.deployed()
    
            // Set presale as admin to both tokens
            await joyToken.connect(owner).addAdmin(presale.address)
            await xJoyToken.connect(owner).addAdmin(presale.address)
    
            // Also presales has to be whitelisted
            await xJoyToken.connect(owner).addToWhitelist(presale.address)
    
            // Transfer all 2.05B xJoy to Presale Contract
            await xJoyToken.connect(owner).transfer(presale.address, ethers.utils.parseEther('2050000000'))
    
            // Transfer Ownership for Joy, xJoy, Presale - OWNER_ADDRESS
            // await joyToken.connect(owner).transferOwnership(OWNER_ADDRESS)
            // await xJoyToken.connect(owner).transferOwnership(OWNER_ADDRESS)
    
            // And start sale for tests
            // await presale.connect(owner).startSale(false)
            // await joyToken.connect(owner).setProtectedSwaps(false);
        });

        it('Add xJoy purchasers', async () => {

            let addresses: string[] = []
            let deposits: Presale.DepositInfoStruct[] = []

            let plan = await fetchPlan()
            console.log('plan', plan)

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
                    // console.log('addr, depos, true', addr, depos, true)
                    zzz += 1;
                    await presale.connect(owner).addPurchasers(addr, depos, true)
                } else {
                    // console.log('addresses, deposits, true', addresses, deposits, true)
                    xxx += 1;
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
            console.log('await presale.totalPurchasers()', await presale.totalPurchasers())
            console.log('await presale.purchaserAddress(331)', await presale.purchaserAddress(331))
            // ADD PURCHASERS

            // Transfer Ownership for Joy, xJoy, Presale - OWNER_ADDRESS
            await joyToken.connect(owner).transferOwnership(OWNER_ADDRESS)
            await xJoyToken.connect(owner).transferOwnership(OWNER_ADDRESS)
            await presale.connect(owner).changeOwnership(OWNER_ADDRESS)

            // Renounce Ownership for Joy, xJoy, Presale - owner.address
            await joyToken.connect(owner).renounceRole(await presale.DEFAULT_ADMIN_ROLE(), owner.address)
            await xJoyToken.connect(owner).renounceRole(await presale.DEFAULT_ADMIN_ROLE(), owner.address)
            await presale.connect(owner).renounceRole(await presale.DEFAULT_ADMIN_ROLE(), owner.address)

            // CHECK IF DEPLOYER IS STILL ADMIN
            console.log('await presale.hasRole(DEFAULT_ADMIN_ROLE, owner.address)', await presale.hasRole(await presale.DEFAULT_ADMIN_ROLE(), owner.address))
            console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)', await joyToken.hasRole(await presale.DEFAULT_ADMIN_ROLE(), owner.address))
            console.log('await xJoyToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)', await xJoyToken.hasRole(await presale.DEFAULT_ADMIN_ROLE(), owner.address))

            // RECHECK IF OWNER IS NOW MULTISIG OWNER ADDRESS
            console.log('await joyToken.owner()', await joyToken.owner())
            console.log('await xJoyToken.owner()', await xJoyToken.owner())
            console.log('await presale.owner()', await presale.owner())
        });

    })

})
