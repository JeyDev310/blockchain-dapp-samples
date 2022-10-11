import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'
import { Wallet, Contract } from 'ethers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import Multicall from '../../../abis/MulticallAbi'
import { JoyToken, Presale } from '../../../typechain-types/contracts'
import { JoyToken__factory, XJoyToken } from '../../../typechain-types'
import { increaseTime } from '../../../utils/increaseTime'
import { impersonateAccount } from '../../../utils/impersonateAccount'

const toEth: Function = (value: string) => ethers.utils.parseEther(value).toString()
const signerWrapper = (privKey: string, provider: any) => new Wallet(privKey, provider)
const BN_From = (number: string | number) => ethers.BigNumber.from(number)

const { pKowner, ALCHEMY_MAINNET } = process.env
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')

let owner = signerWrapper(pKowner ?? '', provider)
console.log('owner', owner.address)


interface JoySnapshot {
    address: string
    tokens: string
}

function fetchPlan(): Promise<JoySnapshot[]> {
    return new Promise(function (resolve, reject) {
        let results: JoySnapshot[] = []

        const coolPath = path.join(__dirname + '/../../../holders_all_test_final_burnable.csv')
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

describe('Deploying Joy, xJoy, Presale V2', async () => {
    let joyToken: JoyToken
    let xJoyToken: XJoyToken
    let presale: Presale
    let multicall: Contract

    // (JOY, xJOY, Presale)
    let INITIAL_OWNER_ADDRESS: string = '0x5FBb6f67d9C359Ac30C5a276F362ef84Eb333cA6'
    let OWNER_ADDRESS: string = '0xAcD82F99Ccb15A81A4a440CE654eC335CBc1Dac6'
    let TREASURY_ADDRESS: string = '0xe24aB7eBE787A5077B8BBC344C70ff0b57545263'
    let JOY_V2_LP_GNOSIS: string = '0x68eff6a8795c62fD41388a0306Bf7C9BF7E191db'

    let xJOY_ADDRESS: string = "0x592a74d0228999ea06010fdc4f954374289bc952"
    let JOY_ADDRESS: string = "0x4E114d405b9Ba2F59524941733e505Ae03Fb1FB5"
    let PRESALE_ADDRESS: string = "0x9c1db5a007ca710c8c17e538afc1ba96f2eab44c"
    let JOY_V2_PAIR_ADDRESS: string = "0x3A3A0669F06AE44f38137Dd4A83c1A2899FcF92a"

    let multisigOwner: Wallet
    let multisigTreasury: Wallet

    let ROUTER_ADDRESS: string = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
    let UNI_ROUTER: Contract
    let UNI_FACTORY: Contract

    let FACTORY_ADDRESS: string = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
    let USDC_ADDRESS: string = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    let USDC: Contract

    let purchaser: Wallet

    describe('Basic Setup', async () => {
        it('Joy, xJoy, Presale Setup', async () => {
            await impersonateAccount(provider, owner.address)
            multisigOwner = await impersonateAccount(provider, OWNER_ADDRESS)
            multisigTreasury = await impersonateAccount(provider, TREASURY_ADDRESS)
            purchaser = await impersonateAccount(provider, "0x4BFC351246a22944B9ae98C56e77561bA3FD0da4")

            joyToken = await ethers.getContractAt('JoyToken', JOY_ADDRESS, owner)
            xJoyToken = await ethers.getContractAt('XJoyToken', xJOY_ADDRESS, owner)
            presale = await ethers.getContractAt('Presale', PRESALE_ADDRESS, owner)

            multicall = await ethers.getContractAt(Multicall, "0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441", owner)

            UNI_FACTORY = await ethers.getContractAt(
                'IUniswapFactory',
                FACTORY_ADDRESS,
                owner
            )
            UNI_ROUTER = await ethers.getContractAt(
                'IUniswapRouter02',
                ROUTER_ADDRESS,
                owner
            )

            USDC = await ethers.getContractAt('IWETH', USDC_ADDRESS, owner)
        });

        
        it('Test whitelist and owner', async () => {
            console.log('await joyToken.whitelisted(JOY_V2_LP_GNOSIS)', await joyToken.whitelisted(JOY_V2_LP_GNOSIS))
            console.log('await joyToken.whitelisted(owner.address)', await joyToken.whitelisted(owner.address))
            // console.log('await joyToken.whitelisted(TREASURY_ADDRESS)', await joyToken.whitelisted(TREASURY_ADDRESS))
            // console.log('await joyToken.whitelisted(INITIAL_OWNER_ADDRESS)', await joyToken.whitelisted(INITIAL_OWNER_ADDRESS))
            // console.log('await joyToken.whitelisted(OWNER_ADDRESS)', await joyToken.whitelisted(OWNER_ADDRESS))
            // console.log('await joyToken.whitelisted(JOY_ADDRESS)', await joyToken.whitelisted(JOY_ADDRESS))
            // console.log('await joyToken.whitelisted(xJOY_ADDRESS)', await joyToken.whitelisted(xJOY_ADDRESS))
            // console.log('await joyToken.whitelisted(PRESALE_ADDRESS)', await joyToken.whitelisted(PRESALE_ADDRESS))
            // console.log('await joyToken.whitelisted(JOY_V2_PAIR_ADDRESS)', await joyToken.whitelisted(JOY_V2_PAIR_ADDRESS))
        });

        it('Test admin', async () => {
            console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, OWNER_ADDRESS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), OWNER_ADDRESS))
            console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, TREASURY_ADDRESS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), TREASURY_ADDRESS))
            console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, PRESALE_ADDRESS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), PRESALE_ADDRESS))
            console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), owner.address))
            // console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, INITIAL_OWNER_ADDRESS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), INITIAL_OWNER_ADDRESS))
            // console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, JOY_ADDRESS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), JOY_ADDRESS))
            // console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, xJOY_ADDRESS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), xJOY_ADDRESS))
            // console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, JOY_V2_PAIR_ADDRESS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), JOY_V2_PAIR_ADDRESS))
            // console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, JOY_V2_LP_GNOSIS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), JOY_V2_LP_GNOSIS))
        });

        it('Test adding and changing ownership to HOT WALLET from GNOSIS SAFE', async () => {
            await joyToken.connect(multisigOwner).addAdmin(owner.address)
            await joyToken.connect(multisigOwner).transferOwnership(owner.address)
        });

        it('Test removing admin from HOT WALLET', async () => {
            await joyToken.connect(owner).removeFromWhitelist(JOY_V2_LP_GNOSIS)
            await joyToken.connect(owner).removeAdmin(PRESALE_ADDRESS)
            await joyToken.connect(owner).removeAdmin(TREASURY_ADDRESS)
            await joyToken.connect(owner).removeAdmin(OWNER_ADDRESS)
            await joyToken.connect(owner).transferOwnership(OWNER_ADDRESS)
            await joyToken.connect(owner).removeAdmin(owner.address)
        })

        it('Presale should still work after renouncing admin ownership', async () => {
            let addresses: string[] = []
            let tokens: string[] = []

            let plan = await fetchPlan()
            // console.log('plan', plan)

            plan.forEach((p) => {
                addresses.push(p.address)
                tokens.push(ethers.utils.parseEther(p.tokens).toString())
            })

            console.log('await joyToken.totalSupply()', await joyToken.totalSupply())

            for (let i = 0; i < plan.length; i++) {
                await joyToken.connect(multisigOwner).burn(addresses[i], tokens[i])
            }

            console.log('await joyToken.totalSupply()', await joyToken.totalSupply())

            // DEPLOYMENT STEP HOT WALLET
            // await joyToken.connect(owner).removeAdmin(OWNER_ADDRESS)
            // await joyToken.connect(owner).transferOwnership(OWNER_ADDRESS)
            // await joyToken.connect(owner).removeAdmin(owner.address)
            // DEPLOYMENT STEP HOT WALLET
        });

        it('Test whitelist and owner', async () => {
            console.log('await joyToken.whitelisted(JOY_V2_LP_GNOSIS)', await joyToken.whitelisted(JOY_V2_LP_GNOSIS))
            console.log('await joyToken.whitelisted(owner.address)', await joyToken.whitelisted(owner.address))
            // console.log('await joyToken.whitelisted(TREASURY_ADDRESS)', await joyToken.whitelisted(TREASURY_ADDRESS))
            // console.log('await joyToken.whitelisted(INITIAL_OWNER_ADDRESS)', await joyToken.whitelisted(INITIAL_OWNER_ADDRESS))
            // console.log('await joyToken.whitelisted(OWNER_ADDRESS)', await joyToken.whitelisted(OWNER_ADDRESS))
            // console.log('await joyToken.whitelisted(JOY_ADDRESS)', await joyToken.whitelisted(JOY_ADDRESS))
            // console.log('await joyToken.whitelisted(xJOY_ADDRESS)', await joyToken.whitelisted(xJOY_ADDRESS))
            // console.log('await joyToken.whitelisted(PRESALE_ADDRESS)', await joyToken.whitelisted(PRESALE_ADDRESS))
            // console.log('await joyToken.whitelisted(JOY_V2_PAIR_ADDRESS)', await joyToken.whitelisted(JOY_V2_PAIR_ADDRESS))
        });

        it('Test admin', async () => {
            console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, OWNER_ADDRESS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), OWNER_ADDRESS))
            console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, TREASURY_ADDRESS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), TREASURY_ADDRESS))
            console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, PRESALE_ADDRESS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), PRESALE_ADDRESS))
            console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), owner.address))
            // console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, INITIAL_OWNER_ADDRESS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), INITIAL_OWNER_ADDRESS))
            // console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, JOY_ADDRESS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), JOY_ADDRESS))
            // console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, xJOY_ADDRESS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), xJOY_ADDRESS))
            // console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, JOY_V2_PAIR_ADDRESS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), JOY_V2_PAIR_ADDRESS))
            // console.log('await joyToken.hasRole(DEFAULT_ADMIN_ROLE, JOY_V2_LP_GNOSIS)', await joyToken.hasRole(await joyToken.DEFAULT_ADMIN_ROLE(), JOY_V2_LP_GNOSIS))
        });
        // return 

        it('Presale should still work after renouncing admin ownership', async () => {
            // TODO
            await presale.connect(multisigOwner).addPurchasers(
                ["0x68E565fA10c4a124992B1a5bd1Fd6471a709C10D", "0x68E565fA10c4a124992B1a5bd1Fd6471a709C10D"],
                [
                    {
                        vestingType: BN_From(2),
                        depositedAmount: ethers.utils.parseEther('111'),
                        purchasedAmount: ethers.utils.parseEther('222'),
                        depositTime: BN_From(Math.floor(Date.now() / 1000)),
                    },
                    {
                        vestingType: BN_From(1),
                        depositedAmount: ethers.utils.parseEther('1111'),
                        purchasedAmount: ethers.utils.parseEther('2222'),
                        depositTime: BN_From(Math.floor(Date.now() / 1000)),
                    }
                ],
                true
            )
        })

        it('One can make a deposit using USDC', async () => {
            console.log('finalXJoydeposit', await xJoyToken.balanceOf(owner.address))
            let amount = ethers.utils.parseUnits('10', 6)
            await USDC.connect(owner).approve(presale.address, amount)
            await presale.connect(owner).deposit(amount, 0)

            let finalXJoydeposit = await xJoyToken.balanceOf(owner.address)
            console.log('finalXJoydeposit', finalXJoydeposit)
            // expect(finalXJoydeposit).to.be.equal(
            //     ethers.utils.parseEther('15.5')
            // )
        })

        it('JoyToken is swappable', async () => {
            // await joyToken.connect(multisigOwner).burn("0xe2867EAD8E60EB3Be2ff0264A8D76c6d051C0cEA", toEth('25000000'))
            await joyToken.connect(multisigOwner).mint(owner.address, toEth('1000'))

            await USDC.connect(owner).approve(ROUTER_ADDRESS, 100 * 1e6)
            await joyToken.connect(owner).approve(ROUTER_ADDRESS, toEth('100'))

            const block = await ethers.provider.getBlock('latest')
            const deadline = Math.floor(block.timestamp) // now + 1 minute

            const swap1 = await UNI_ROUTER.connect(owner).swapExactTokensForTokens(
                toEth('0.1'),
                0,
                [joyToken.address, USDC.address],
                owner.address,
                deadline + 10
            )
            await swap1.wait()
        })

        it('Test vesting worked correctly', async () => {
            const purchaserAddress = await presale.purchaserAddress(331)
            console.log('purchaserAddress', purchaserAddress)
            console.log('await presale.totalPurchasers()', await presale.totalPurchasers())
            console.log('await presale.calcWithdrawalAmount(purchaserAddress)', await presale.calcWithdrawalAmount(purchaserAddress))
            increaseTime(11 * 30 * 24 * 60 * 60); // 11 month 
            console.log('await joyToken.balanceOf(purchaserAddress)', await joyToken.balanceOf(purchaserAddress));
            console.log('await presale.calcWithdrawalAmount(purchaserAddress)', await presale.calcWithdrawalAmount(purchaserAddress))
            increaseTime(1 * 30 * 24 * 60 * 60); // 1 month 
            console.log('await presale.calcWithdrawalAmount(purchaserAddress)', await presale.calcWithdrawalAmount(purchaserAddress))
            console.log('await joyToken.balanceOf(purchaserAddress)', await joyToken.balanceOf(purchaserAddress));
            // console.log('await presale.connect(purchaser).withdraw()', await presale.connect(purchaser).withdraw());
            increaseTime(20 * 30 * 24 * 60 * 60); // 20 month
            console.log('await presale.calcWithdrawalAmount(purchaserAddress)', await presale.calcWithdrawalAmount(purchaserAddress))
            console.log('await joyToken.balanceOf(purchaserAddress)', await joyToken.balanceOf(purchaserAddress));
            // console.log('await presale.connect(purchaser).withdraw()', await presale.connect(purchaser).withdraw());
            console.log('await presale.calcWithdrawalAmount(purchaserAddress)', await presale.calcWithdrawalAmount(purchaserAddress))
            console.log('await xJoyToken.balanceOf(purchaserAddress)', await xJoyToken.balanceOf(purchaserAddress));
            increaseTime(12 * 30 * 24 * 60 * 60); // 12 month
            const fullAmount = await presale.calcWithdrawalAmount(purchaserAddress);
            console.log('fullAmount', fullAmount);
            const fullXjoyBalance = await xJoyToken.balanceOf(purchaserAddress);
            console.log('await xJoyToken.connect(purchaser).approve(presale.address, fullAmount)', await xJoyToken.connect(purchaser).approve(presale.address, fullXjoyBalance));
            console.log('await joyToken.balanceOf(purchaserAddress)', await joyToken.connect(multisigOwner).mint(presale.address, ethers.utils.parseEther("10000000")));
            console.log('await presale.connect(purchaser).withdraw()', await presale.connect(purchaser).withdraw());
            console.log('await presale.calcWithdrawalAmount(purchaserAddress)', await presale.calcWithdrawalAmount(purchaserAddress))
            console.log('await joyToken.balanceOf(purchaserAddress)', await joyToken.balanceOf(purchaserAddress));
            console.log('await xJoyToken.balanceOf(purchaserAddress)', await xJoyToken.balanceOf(purchaserAddress));
        })

        // it('Test multicall burning', async () => {
        //     console.log('totalSupply before', await joyToken.totalSupply())

        //     const ERC721Interface = new ethers.utils.Interface(JoyToken__factory.abi);

        //     const addressMapping = [
        //         {
        //             "Address": "0x68E565fA10c4a124992B1a5bd1Fd6471a709C10D",
        //             "Amount": "25,000,000.00",
        //         },
        //         {
        //             "Address": "0xde866403083aFA912e38ab78fEF2CF9781b4E61A",
        //             "Amount": "25,000,000.00",
        //         },
        //         // {
        //         //     "Address": "0xf91Eb3eC47A1ACe24322F2aeA6070CdFD9d6d0ce",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x785D82E71d62Bbe63946881730BB7a117ffDC2B3",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x6D753F3B37537bA058cD78A95f55441AafF9d7d6",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x86EE097201b7b95e50f54aa8dD9F4042aAF7F75E",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x2007221a9084198B6FfCF8BA7229fBBeF94EeC71",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x38966E7043b8B859ebD96eC49537A6cf7a24a9C3",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x7DB5FeeE0864861bd74fafae485FebDD013169B0",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xB19310deC1ED814237fd3e745fFC762c93479952",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x37332176e064e5D635210337D5DcF2D83B6657aC",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x84d7A0dA4cD8eB3129787e92BC7Ad59c022E48B5",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x66C1b5F72429401FD797C1A2C471238d63C63818",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x57ff49bd3e05922b5d8bC0cE8FEE7e56398185D7",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x58201022a9d77dc5c51FfAFe5616c2dcb062D709",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x26172AC6d0E98b076893D2913BEBDC9200aA95d3",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x7099251771ca147130874a344ee4EB4691D16F8F",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xd07707c9c75b04FDD71a90AEc6684e87098bD3E7",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x98eCB85acc0200D348103759485255f8343ADA76",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x0D599a725caf96AA422FFaf00F7305C923a4306D",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xDb4Ea3F7B07D500827FaE68AD0b844a4d68344c4",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x4b5F04c819b2cB18A8fEE914a4D728dEA2E545dF",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xeCB8FaAc51E09222821E0a15a53BC971232b7aB7",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x3BfBacc8d4F55E0360D612C48c27AA2B212c4742",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xF006DD0980f1DB007d91D6bEF13a137bDaF110d1",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xc353EDFb5682a8CC2A58C1c269346f32F9c8aFBB",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x723074D52DE7Eaea071c71577bf031f7Cb1b5C83",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x6C84f4452D135663308968e7f1099F01009627b8",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x86C6EC70bc588580fB0e9A33c87A7ce5BA3C5BF7",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xa8e566d1EcD7C4FEdA36590658294ea7091684ca",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x753CEE5684Eb7fDB73F287F203E1106fB1EC9AC9",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x9090eBF3296fBcad1DBc99915bE8988CBB3b851f",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xB8eC0EB7Ac3556C6b61C0418991CAA3fe4CD2431",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x4c268b87a52466AEc283BF9CBc6f3eE2AD8a8c7b",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x57f36DfB5f12C3ed15bB55Fd9B04eb054F99adfE",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x000Da5A346664577DA58dE13EA69Ce662dE90f51",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xC05F427A90B0201962A22d0D8ee004D35B43442D",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x825d5AD8885E196d36FfFC707b915190A75FDe8b",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x1A49b76E5682Cb8b084278e72AafA40f6373eb2A",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x7bfE96E02Ec8706e33F20298d94c45A1d11a9033",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x6CF401a9120F28dB026f2E83f172Ad499270CfEb",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xa70D7B2dB9b538A5bC3D065Fb6216B554627205e",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x54915D7AD2801Ef4a5912A33ba1B1d037c3DAe9e",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x913736e040ccafd6759B0d1844adE774d0683587",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xa0aC789Ca31ED34E2b99Cb9061C9567266aA51CC",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x1BAF733eADB4B1f6d1c4FC9bc9caF2a2212e3770",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x90595c3C9EAbf4A045E984d201f636bBaD022CF4",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xD50E3a6fd0434CCA9E5f3e028641E1C6bac43fEC",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xB891898f978430B87cd433aeAb51e2Ae3744DAB2",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xB9D8049beb1A83061CB8088846DC85b1156f276D",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x2b971eF0929273D1c083c6Cc113A363BE63c2c1D",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xd3b97D52E315165d78221da04126ea8142557258",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x6881701BEbEaD974a3724337be3102CeE06e5D60",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x10cCEc7B88Ad4f96F07fa97E046A2c920CE18808",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xd3ea4344D2B193bb98573DDAe97E3610E67206e7",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xD7B57d0Ad4a319335c5a6E5c29b4bd226966fDAF",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x1b6C6318FbE43F99c17e666eA0CD3Bf242f0025E",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x4AC0150D3a1B7a93F888eE316f3BFF61c3DFd202",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x08EbbB2cd1072a01B6de436d1F328B1A01A59Fa5",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x7404f9d660cb9142dEd66c9D5218A5EDf68cC723",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xc7a234006666C80E016F6a3ae325Bb6142D2f380",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xdCE7f3266b514D3fb286aAE1d6AAade21bfdeAb4",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x4cc41a66A831d3e9659B2F2317d25b35Fbc0718a",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x90Cc879429d05476898A14576CD542d4D477c3dd",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x37a9b03a65302E00C511283c1Ffe96203E9e7BCE",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xa6315FB6ea1cDAd2a0482930d3Ead6EF25b53d5c",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x1B3c24fDB2B6C2447383BDCB4Cb1B5362999A009",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x32Ac878CbFd731437D425ab194173895cd867a12",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xbB0eF550a214B43126aCf593c26A89ACEC63cc6E",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x9a264c2689478ED9803C5c8db1F4a0E53c48D194",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xf6Cb1338179461735a32ECb7C370B248e82d7232",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x0dA6EBcee2b75317ed88f61E5543469b82c36876",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xE28A6fCB552836222d77a6212DFb667eABB15093",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x2F027E1E1658933eA8E44F14a9258964b0EC9387",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xF3F6eB992614aD0A47c2B0757F89c4a1cd987E27",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x86E8C4976602B981F4a8960a876cc00af0bA89b9",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xa074A05C8AB0A9468DDFDe76b69d1CF46eda3014",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xe2867EAD8E60EB3Be2ff0264A8D76c6d051C0cEA",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0xc51fD9FbAe2dcdE0EAdfC936e7AA57faF1F26cd9",
        //         //     "Amount": "25,000,000.00",
        //         // },
        //         // {
        //         //     "Address": "0x03D20661832e21Aa1E99a690aF7c7B9AcB2a32Af",
        //         //     "Amount": "25,000,000.00",
        //         // }
        //     ];

        //     let tuplet: any = [];
        //     addressMapping.map(map => {
        //         const txData = ERC721Interface.encodeFunctionData("burn", [ethers.utils.getAddress(map.Address), ethers.utils.parseEther(parseInt(map.Amount).toString())]);
        //         tuplet.push([ethers.utils.getAddress("0x4e114d405b9ba2f59524941733e505ae03fb1fb5"), txData]);
        //     });

        //     await multicall.connect(multisigOwner).aggregate(tuplet)

        //     console.log('totalSupply after', await joyToken.totalSupply())
        // });

    })

})


// ADMIN
// 0x9c1dB5A007ca710c8C17E538aFc1ba96f2eaB44c
// 0x9c1dB5A007ca710c8C17E538aFc1ba96f2eaB44c

// OWNER


// WHITELIST
// 0x9c1dB5A007ca710c8C17E538aFc1ba96f2eaB44c


// OWNERSHIP
// 0xAcD82F99Ccb15A81A4a440CE654eC335CBc1Dac6
// 0xAcD82F99Ccb15A81A4a440CE654eC335CBc1Dac6
// 0xAcD82F99Ccb15A81A4a440CE654eC335CBc1Dac6


// ADD MANY WHITELIST
// 0x5FBb6f67d9C359Ac30C5a276F362ef84Eb333cA6
// 0x68eff6a8795c62fD41388a0306Bf7C9BF7E191db
// 0x0000000000000000000000000000000000000000

// RESULTS

// WHITELIST - 0x68eff6a8795c62fD41388a0306Bf7C9BF7E191db - UniPair JoyV2/USDC