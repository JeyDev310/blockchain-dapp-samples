import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import {
    JoyToken,
    JoyPresale,
    ERC20Stub,
} from '../../typechain-types/contracts'
import { JoyPresale__factory, XJoyToken } from '../../typechain-types'
import csv from 'csv-parser'
import fs from 'fs'

const BN_From = (number:string | number) => ethers.BigNumber.from(number);

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

        fs.createReadStream('vesting_plan.csv')
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

describe('JoyPresale', async () => {
    let owner: SignerWithAddress
    let admin: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress
    let user4: SignerWithAddress

    let joyToken: JoyToken
    let xJoyToken: XJoyToken
    let presale: JoyPresale

    let fakeCoin1: ERC20Stub
    let fakeCoin2: ERC20Stub
    let fakeCoin3: ERC20Stub

    const thirtyDays = 2592000
    const oneDay = 86400

    before(async () => {
        ;[owner, admin, user1, user2, user3, user4] = await ethers.getSigners()

        let XJoyTokenF = await ethers.getContractFactory('XJoyToken')
        xJoyToken = await XJoyTokenF.deploy(
            [],
            [],
            [admin.address],
            true,
            ethers.utils.parseEther('1000000000')
        )
        await xJoyToken.deployed()

        let JoyTokenF = await ethers.getContractFactory('JoyToken')
        joyToken = await JoyTokenF.deploy(
            [],
            [],
            [admin.address],
            ethers.utils.parseEther('1000000000')
        )
        await joyToken.deployed()

        let ERC20Stub = await ethers.getContractFactory('ERC20Stub')
        fakeCoin1 = await ERC20Stub.deploy(
            'Fake Coin 1',
            'FC1',
            ethers.utils.parseEther('1000000000')
        )
        await fakeCoin1.deployed()
        fakeCoin2 = await ERC20Stub.deploy(
            'Fake Coin 2',
            'FC2',
            ethers.utils.parseEther('1000000000')
        )
        await fakeCoin2.deployed()
        fakeCoin3 = await ERC20Stub.deploy(
            'Fake Coin 3',
            'FC3',
            ethers.utils.parseEther('1000000000')
        )
        await fakeCoin3.deployed()

        let JoyPresale = await ethers.getContractFactory('JoyPresale')

        presale = await JoyPresale.deploy(
            joyToken.address,
            xJoyToken.address,
            [
                // SEED
                {
                    releasePercentBasisPoints: 250, // 2.5%
                    cliff: BN_From(thirtyDays).mul(BN_From(8)), // 8 months
                    releaseStep: BN_From(thirtyDays), // 30 days
                    vestingCloseTimeline: BN_From(thirtyDays).mul(BN_From(40)) // 40 months
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
                }
            ],
            owner.address
        )
        
        await presale.deployed()


        // Set presale as admin to both tokens
        await joyToken.addAdmin(presale.address)
        await xJoyToken.addAdmin(presale.address)

        // Also presales has to be whitelisted
        await xJoyToken.addToWhitelist(presale.address)

        // We need to feed some tokens to presale - Joy and xJoy
        await joyToken.transfer(
            presale.address,
            ethers.utils.parseEther('1000000000')
        )
        await xJoyToken.transfer(
            presale.address,
            ethers.utils.parseEther('1000000000')
        )

        // Feed users with some fake coins
        await fakeCoin1.transfer(user1.address, ethers.utils.parseEther('1000'))
        await fakeCoin2.transfer(user1.address, ethers.utils.parseEther('1000'))
        await fakeCoin1.transfer(user2.address, ethers.utils.parseEther('1000'))
        await fakeCoin2.transfer(user2.address, ethers.utils.parseEther('1000'))
        await fakeCoin1.transfer(user3.address, ethers.utils.parseEther('1000'))

        // And start sale for tests
        await presale.startSale(true)
    })

    it('One can make a deposit using one of enlisted coins', async () => {
        await fakeCoin1.connect(user1).approve(presale.address, ethers.utils.parseEther('100'))
        await presale.connect(user1).deposit(ethers.utils.parseEther('100'), 0)

        let finalXJoydeposit = await xJoyToken.balanceOf(user1.address)
        expect(finalXJoydeposit).to.be.equal(ethers.utils.parseEther('100'))
    })

    it('One can make a deposit using second of enlisted coins - smaller rate', async () => {
        let innitialXJoydeposit = await xJoyToken.balanceOf(user1.address)
        await fakeCoin2
            .connect(user1)
            .approve(presale.address, ethers.utils.parseEther('100'))
        await presale.connect(user1).deposit(ethers.utils.parseEther('100'), 1)

        let finalXJoydeposit = await xJoyToken.balanceOf(user1.address)
        expect(finalXJoydeposit.sub(innitialXJoydeposit)).to.be.equal(
            ethers.utils.parseEther('500')
        )
    })

    it('No deposits possible if sale is closed', async () => {
        await presale.connect(owner).startSale(false)

        await fakeCoin1
            .connect(user1)
            .approve(presale.address, ethers.utils.parseEther('100'))

        await expect(
            presale.connect(user1).deposit(ethers.utils.parseEther('100'), 0)
        ).to.be.revertedWithCustomError(presale, "SALE_NOT_LIVE")
    })

    it('Not possible to withdraw any funds before cliff date', async () => {
        await expect(presale.connect(user1).withdraw())
            .to.be.revertedWithCustomError(presale, "STILL_VESTING");
    })

    it('Not possible to withdraw if nothing deposited', async () => {
        await expect(presale.connect(user3).withdraw())
            .to.be.revertedWithCustomError(presale, "NOTHING_TO_WITHDRAW");
    })

    it('Possible to withdraw released funds after cliff date reached', async () => {
        await presale.connect(owner).startSale(true)
        await ethers.provider.send('evm_increaseTime', [thirtyDays * 12 + oneDay])
        await ethers.provider.send('evm_mine', [])

        let initxJoyBalance = await xJoyToken.balanceOf(user1.address)
        let allowedToGet = await presale.calcWithdrawalAmount(user1.address)

        expect(allowedToGet).to.be.equal(ethers.utils.parseEther('0.78'))

        await xJoyToken
        .connect(user1)
        .approve(presale.address, ethers.utils.parseEther('0.78'))

        await presale.connect(user1).withdraw()

        let joyBalance = await joyToken.balanceOf(user1.address)
        let finishxJoyBalance = await xJoyToken.balanceOf(user1.address)

        expect(joyBalance).to.be.equal(ethers.utils.parseEther('0.78'))
        expect(initxJoyBalance.sub(finishxJoyBalance)).to.be.equal(joyBalance)
    })

    it('Check if multivesting works properly on same vesting level', async () => {
        await presale.startSale(true)

        await fakeCoin1
            .connect(user1)
            .approve(presale.address, ethers.utils.parseEther('100'))

        await presale.connect(user1).deposit(ethers.utils.parseEther('100'), 0)

        // Wait to release funds of new deposit
        await ethers.provider.send('evm_increaseTime', [
            thirtyDays * 12 + oneDay,
        ])
        await ethers.provider.send('evm_mine', [])

        let allowedToGet = await presale.calcWithdrawalAmount(user1.address)

        // First vesting is free totally. Second only started the release
        expect(allowedToGet).to.be.equal(ethers.utils.parseEther('281.71'))
    })

    it('Check multivesting on different vesting levels', async () => {
        await presale.startSale(true)

        await fakeCoin1
            .connect(user2)
            .approve(presale.address, ethers.utils.parseEther('200'))
        await presale.connect(user2).deposit(ethers.utils.parseEther('100'), 0)

        await presale.connect(user2).deposit(ethers.utils.parseEther('100'), 0)

        const initialxJoyBalance = await xJoyToken.balanceOf(user2.address)
        expect(initialxJoyBalance).to.be.equal(ethers.utils.parseEther('200'))

        // Now we switch to the end of first cliff + 1 month
        await ethers.provider.send('evm_increaseTime', [
            thirtyDays * 12 + oneDay,
        ])
        await ethers.provider.send('evm_mine', [])

        // We should be able to get 2.6% of first investment only
        const allowance11m = await presale.calcWithdrawalAmount(user2.address)

        expect(allowance11m).to.be.equal(ethers.utils.parseEther('0.26'))

        // Now we switch one month more when we will have additional 2.5% from first vesting
        // and 0.07% from second one
        await ethers.provider.send('evm_increaseTime', [thirtyDays])
        await ethers.provider.send('evm_mine', [])

        const allowance12m = await presale.calcWithdrawalAmount(user2.address)
        expect(allowance12m).to.be.equal(ethers.utils.parseEther('8.06'))
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
                    depositTime: BN_From(
                        Math.floor(Date.now() / 1000)
                    ),
                },
                {
                    vestingType: BN_From(3),
                    depositedAmount: ethers.utils.parseEther('1000'),
                    purchasedAmount: ethers.utils.parseEther('1500'),
                    depositTime: BN_From(
                        Math.floor(Date.now() / 1000)
                    ),
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

    it('Test import seeds from csv file', async () => {
        // Testing

        let addresses: string[] = []
        let deposits: JoyPresale.DepositInfoStruct[] = []

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
                // console.log('addr, depos, true', addr, depos, true)
                zzz += 1;
                await presale.addPurchasers(addr, depos, true)
            } else {
                // console.log('addresses, deposits, true', addresses, deposits, true)
                xxx += 1;
                await presale.addPurchasers(addresses, deposits, true)
                break
            }
        }

        console.log('zzz', zzz)
        console.log('xxx', xxx)
    })

    it('Fetching all coins from presale contract', async () => {
        await expect(presale.withdrawAllxJoyTokens(owner.address)).to.emit(
            xJoyToken,
            'Transfer'
        )

        await expect(presale.withdrawAllJoyTokens(owner.address)).to.emit(
            joyToken,
            'Transfer'
        )

        await expect(presale.withdrawAllCoins(owner.address)).to.emit(
            fakeCoin1,
            'Transfer'
        )
    })

    it('Fetching all coins from presale contract', async () => {
        const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        console.log('await presale.pairInfo()', await presale.pairInfo(joyToken.address, USDC_ADDRESS))
    })
})
