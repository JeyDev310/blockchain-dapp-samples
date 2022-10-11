import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'
import { Wallet, Contract } from 'ethers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { JoyToken, Presale } from '../../../typechain-types/contracts'
import { XJoyToken } from '../../../typechain-types'
import { impersonateAccount } from '../../../utils/impersonateAccount'

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

        const coolPath = path.join(__dirname + '/../../../vesting_plan.csv')
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

describe('Presale', async () => {
    let joyToken: JoyToken
    let xJoyToken: XJoyToken
    let presale: Presale

    let FACTORY_ADDRESS: string = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
    let ROUTER_ADDRESS: string = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
    let USDT_ADDRESS: string = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    let USDC_ADDRESS: string = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    let USDC: Contract
    let USDT: Contract
    let UNI_ROUTER: Contract
    let JOY_USDC_PAIR: Contract
    let UNI_FACTORY: Contract

    const thirtyDays = 2592000
    const oneDay = 86400

    before(async () => {
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

        let XJoyTokenF = await ethers.getContractFactory('XJoyToken')
        xJoyToken = await XJoyTokenF.connect(owner).deploy(
            [],
            [],
            [owner.address, admin.address],
            true,
            ethers.utils.parseEther('2050000000')
        )
        await xJoyToken.deployed()

        let JoyTokenF = await ethers.getContractFactory('JoyToken')
        joyToken = await JoyTokenF.connect(owner).deploy(
            [whitelisted.address, whitelisted2.address],
            [blacklisted.address],
            [admin.address, owner.address]
        )
        await joyToken.deployed()

        USDC = await ethers.getContractAt('IWETH', USDC_ADDRESS, owner)
        USDT = await ethers.getContractAt('IWETH', USDT_ADDRESS, owner)

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
            owner.address
        )

        await presale.deployed()

        // Set presale as admin to both tokens
        await joyToken.connect(owner).addAdmin(presale.address)
        await xJoyToken.connect(owner).addAdmin(presale.address)

        // Also presales has to be whitelisted
        await xJoyToken.connect(owner).addToWhitelist(presale.address)

        // Mint JOY and XJOY
        await joyToken
            .connect(owner)
            .mint(owner.address, ethers.utils.parseEther('3000000000'))
        await xJoyToken
            .connect(owner)
            .mint(owner.address, ethers.utils.parseEther('2000000000'))
        await joyToken
            .connect(owner)
            .mint(presale.address, ethers.utils.parseEther('1000000000'))

        // We need to feed some tokens to presale - Joy and xJoy
        await joyToken
            .connect(owner)
            .transfer(presale.address, ethers.utils.parseEther('1000000000'))
        await xJoyToken
            .connect(owner)
            .transfer(presale.address, ethers.utils.parseEther('1000000000'))

        // Feed users with some fake coins
        await USDC.connect(owner).transfer(user1.address, 200 * 1e6)
        await USDC.connect(owner).transfer(user2.address, 100 * 1e6)

        await USDT.connect(owner).transfer(user1.address, 200 * 1e6)
        await USDT.connect(owner).transfer(user2.address, 100 * 1e6)

        // And start sale for tests
        await presale.connect(owner).startSale(true)

        const block = await ethers.provider.getBlock('latest')
        const deadline = Math.floor(block.timestamp) // now + 1 minute

        await USDC.connect(owner).approve(UNI_ROUTER.address, 10 * 1e6)
        await joyToken.connect(owner).approve(UNI_ROUTER.address, toEth('10'))

        const tx = await UNI_ROUTER.connect(owner).addLiquidity(
            joyToken.address, // address tokenA,
            USDC_ADDRESS, // address tokenB,
            toEth('10'), // uint256 amountADesired,
            10 * 1e6, // uint256 amountBDesired,
            toEth('10'), // usdcAddress
            10 * 1e6, // receiver
            owner.address, // address to,
            deadline + 60 // uint256 deadline
        )
        await tx.wait()

        const SWAP_PAIR = await UNI_FACTORY.getPair(
            joyToken.address,
            USDC_ADDRESS
        )

        JOY_USDC_PAIR = await ethers.getContractAt(
            'IUniswapV2Pair',
            SWAP_PAIR,
            owner
        )

        console.log('ran after JOY USDC PAIR')

        await joyToken.setProtectedSwaps(true);
    })

    describe('Basic Setup', async () => {
        it('One can make a deposit using USDC', async () => {
            let amount = ethers.utils.parseUnits('10', 6)
            await USDC.connect(user1).approve(presale.address, amount)
            await presale.connect(user1).deposit(amount, 0)

            let finalXJoydeposit = await xJoyToken.balanceOf(user1.address)
            expect(finalXJoydeposit).to.be.equal(
                ethers.utils.parseEther('15.5')
            )
        })

        it('One can make a deposit using USDT', async () => {
            let amount = ethers.utils.parseUnits('10', 6)
            await USDT.connect(user1).approve(presale.address, amount)
            await presale.connect(user1).deposit(amount, 1)

            let finalXJoydeposit = await xJoyToken.balanceOf(user1.address)
            expect(finalXJoydeposit).to.be.equal(ethers.utils.parseEther('31'))
        })

        it('No deposits possible if sale is closed', async () => {
            await presale.connect(owner).startSale(false)

            await USDC.connect(user1).approve(presale.address, 10 * 1e6)

            await expect(presale.connect(user1).deposit(10 * 1e6, 0)).eventually
                .to.rejected
        })

        it('Not possible to withdraw any funds before cliff date', async () => {
            await ethers.provider.send('evm_increaseTime', [
                thirtyDays * 12 + oneDay,
            ])
            await ethers.provider.send('evm_mine', [])
            await expect(presale.connect(user1).withdraw()).eventually.to
                .rejected
        })

        it('Not possible to withdraw if nothing deposited', async () => {
            await expect(presale.connect(user3).withdraw()).eventually.to
                .rejected
        })

        it('Not possible to change to vesting index out of bounds', async () => {
            await expect(presale.connect(owner).switchVesting(10)).eventually.to
                .be.rejected
        })

        it('Admin is able to add new vesting level', async () => {
            await expect(
                presale.connect(owner).addVestingType({
                    releasePercentBasisPoints: 100, // 10%
                    cliff: BN_From(thirtyDays).mul(BN_From(12)), // 8 months
                    releaseStep: BN_From(thirtyDays), // 30 days
                    vestingCloseTimeline: BN_From(thirtyDays).mul(BN_From(40)), // 40 months
                })
            ).to.emit(presale, 'VestingTypeAdded')
        })

        it('Possible to withdraw released funds after cliff date reached', async () => {
            await presale.connect(owner).startSale(true)
            await ethers.provider.send('evm_increaseTime', [
                thirtyDays * 12 + oneDay,
            ])
            await ethers.provider.send('evm_mine', [])

            let initxJoyBalance = await xJoyToken.balanceOf(user1.address)
            let allowedToGet = await presale.calcWithdrawalAmount(user1.address)

            expect(allowedToGet).to.be.equal(ethers.utils.parseEther('14.5886'))

            await xJoyToken
                .connect(user1)
                .approve(presale.address, ethers.utils.parseEther('14.5886'))

            await presale.connect(user1).withdraw()

            let joyBalance = await joyToken.balanceOf(user1.address)
            let finishxJoyBalance = await xJoyToken.balanceOf(user1.address)

            expect(joyBalance).to.be.equal(ethers.utils.parseEther('14.5886'))
            expect(initxJoyBalance.sub(finishxJoyBalance)).to.be.equal(
                joyBalance
            )
        })

        it('Check if multivesting works properly on same vesting level', async () => {
            await presale.startSale(true)

            await USDC.connect(user1).approve(presale.address, 10 * 1e6)

            await presale.connect(user1).deposit(10 * 1e6, 0)

            // Wait to release funds of new deposit
            await ethers.provider.send('evm_increaseTime', [
                thirtyDays * 12 + oneDay,
            ])
            await ethers.provider.send('evm_mine', [])

            let allowedToGet = await presale.calcWithdrawalAmount(user1.address)

            // First vesting is free totally. Second only started the release
            expect(allowedToGet).to.be.equal(
                ethers.utils.parseEther('16.43155')
            )
        })

        it('Check multivesting on different vesting levels', async () => {
            await presale.startSale(true)

            await USDC.connect(user2).approve(presale.address, 10 * 1e6)
            await presale.connect(user2).deposit(10 * 1e6, 0)

            const initialxJoyBalance = await xJoyToken.balanceOf(user2.address)
            expect(initialxJoyBalance).to.be.equal(
                ethers.utils.parseEther('15.5')
            )

            // Now we switch to the end of first cliff + 1 month
            await ethers.provider.send('evm_increaseTime', [
                thirtyDays * 12 + oneDay,
            ])
            await ethers.provider.send('evm_mine', [])

            // We should be able to get 2.6% of first investment only
            const allowance11m = await presale.calcWithdrawalAmount(
                user2.address
            )

            expect(allowance11m).to.be.equal(ethers.utils.parseEther('0.02015'))

            // Now we switch one month more when we will have additional 2.5% from first vesting
            // and 0.07% from second one
            await ethers.provider.send('evm_increaseTime', [thirtyDays])
            await ethers.provider.send('evm_mine', [])

            const allowance12m = await presale.calcWithdrawalAmount(
                user2.address
            )
            expect(allowance12m).to.be.equal(ethers.utils.parseEther('0.62465'))
        })

        it('Test multideposits', async () => {
            // TODO
            await presale.addPurchasers(
                [user3.address, user4.address],
                [
                    {
                        vestingType: BN_From(2),
                        depositedAmount: ethers.utils.parseEther('100'),
                        purchasedAmount: ethers.utils.parseEther('200'),
                        depositTime: BN_From(Math.floor(Date.now() / 1000)),
                    },
                    {
                        vestingType: BN_From(3),
                        depositedAmount: ethers.utils.parseEther('1000'),
                        purchasedAmount: ethers.utils.parseEther('1500'),
                        depositTime: BN_From(Math.floor(Date.now() / 1000)),
                    },
                ],
                true
            )

            // xJoy balance should be ok
            expect(await xJoyToken.balanceOf(user3.address)).to.be.equal(
                ethers.utils.parseEther('200')
            )
            expect(await xJoyToken.balanceOf(user4.address)).to.be.equal(
                ethers.utils.parseEther('1500')
            )

            // Check deposits
            const user3DepositInfo = await presale.depositHistory(user3.address)
            const user4DepositInfo = await presale.depositHistory(user4.address)

            const user3Deposit = user3DepositInfo[0]
            const user4Deposit = user4DepositInfo[0]

            expect(user3Deposit.vestingType).to.be.equal(2)
            expect(user4Deposit.vestingType).to.be.equal(3)

            expect(user3Deposit.purchasedAmount).to.be.equal(
                ethers.utils.parseEther('200')
            )
            expect(user4Deposit.purchasedAmount).to.be.equal(
                ethers.utils.parseEther('1500')
            )
            expect(user3Deposit.depositedAmount).to.be.equal(
                ethers.utils.parseEther('100')
            )
            expect(user4Deposit.depositedAmount).to.be.equal(
                ethers.utils.parseEther('1000')
            )
        })
    })

    describe('Initial liquidity and swap cooldown checks', async () => {
        it('Should check if swap cooldown is enforced for JOY/USDC Pair', async () => {
            console.log(
                '(await JOY_USDC_PAIR.getReserves())[0].reserve0',
                (await JOY_USDC_PAIR.getReserves())[0].toString()
            )
            console.log(
                '(await JOY_USDC_PAIR.getReserves())[1].reserve0',
                (await JOY_USDC_PAIR.getReserves())[1].toString()
            )

            await USDC.connect(owner).approve(ROUTER_ADDRESS, 100 * 1e6)
            await joyToken.connect(owner).approve(ROUTER_ADDRESS, toEth('100'))

            const block = await ethers.provider.getBlock('latest')
            const deadline = Math.floor(block.timestamp) // now + 1 minute

            const swap1 = await UNI_ROUTER.connect(
                owner
            ).swapExactTokensForTokens(
                toEth('0.1'),
                0,
                [joyToken.address, USDC.address],
                owner.address,
                deadline + 10
            )
            await swap1.wait()

            const swap2 = await UNI_ROUTER.connect(
                owner
            ).swapExactTokensForTokens(
                toEth('0.1'),
                0,
                [joyToken.address, USDC.address],
                owner.address,
                deadline + 20
            )
            await swap2.wait()

            const swap3 = await UNI_ROUTER.connect(
                owner
            ).swapExactTokensForTokens(
                toEth('0.1'),
                0,
                [joyToken.address, USDC.address],
                owner.address,
                deadline + 30
            )
            await swap3.wait()

            console.log(
                '(await JOY_USDC_PAIR.getReserves())[0].reserve0',
                (await JOY_USDC_PAIR.getReserves())[0].toString()
            )
            console.log(
                '(await JOY_USDC_PAIR.getReserves())[1].reserve0',
                (await JOY_USDC_PAIR.getReserves())[1].toString()
            )

            console.log(
                'await presale.pairInfo()',
                await presale.pairInfo(1 * 1e6)
            )
        })

        it('Should check JOY/USDC Pair 55% OTC Discount works', async () => {
            const block = await ethers.provider.getBlock('latest')
            const deadline = Math.floor(block.timestamp) // n
            const swap1 = await UNI_ROUTER.connect(
                owner
            ).swapExactTokensForTokens(
                toEth('8'),
                0,
                [joyToken.address, USDC.address],
                owner.address,
                deadline + 10
            )
            await swap1.wait()

            const swap2 = await UNI_ROUTER.connect(
                owner
            ).swapExactTokensForTokens(
                toEth('8'),
                0,
                [joyToken.address, USDC.address],
                owner.address,
                deadline + 10
            )
            await swap2.wait()

            const swap3 = await UNI_ROUTER.connect(
                owner
            ).swapExactTokensForTokens(
                toEth('8'),
                0,
                [joyToken.address, USDC.address],
                owner.address,
                deadline + 10
            )
            await swap3.wait()

            console.log(
                '(await JOY_USDC_PAIR.getReserves())[0].reserve0',
                (await JOY_USDC_PAIR.getReserves())[0].toString()
            )
            console.log(
                '(await JOY_USDC_PAIR.getReserves())[1].reserve0',
                (await JOY_USDC_PAIR.getReserves())[1].toString()
            )
            const getFinalReserves = await JOY_USDC_PAIR.getReserves()
            const getPairToken0 = await JOY_USDC_PAIR.token0()
            const getPairToken1 = await JOY_USDC_PAIR.token1()
            const reserveA = (await JOY_USDC_PAIR.getReserves())[0].toString()
            const reserveB = (await JOY_USDC_PAIR.getReserves())[1].toString()
            console.log('getFinalReserves', getFinalReserves)
            console.log('getPairToken0', getPairToken0)
            console.log('getPairToken1', getPairToken1)
            console.log('reserveA', reserveA)
            console.log('reserveB', reserveB)
            // const realPrice = (Number(getFinalReserves.reserve0) / Number(getFinalReserves.reserve1) * 1e12)
            const realPrice = (Number(reserveA) / Number(reserveB)) * 1e12
            // const discount_55 = realPrice / 1.55 // 55% discount
            // const BnRealPrice = BN_From(realPrice);
            // const DiscountPrice = BN_From(BnRealPrice.toString());
            console.log('realPrice', realPrice)
            console.log('realPriceDiscount', realPrice / 1.55)
            // console.log('discount_55', discount_55)
            // console.log('BnRealPrice', BnRealPrice)
            // console.log('DiscountPrice', DiscountPrice)
        })

        it('get PriceInfo', async () => {
            console.log(
                'await presale.pairInfo()',
                await presale.pairInfo(1 * 1e6)
            )
        })
    })

    describe('Finalities', async () => {
        it('Fetching all coins from presale contract', async () => {
            await expect(presale.withdrawAllxJoyTokens(owner.address)).to.emit(
                xJoyToken,
                'Transfer'
            )
        })
    })
})
