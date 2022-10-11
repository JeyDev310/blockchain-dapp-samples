import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { JoyToken } from '../../typechain-types/contracts'

enum TransferMode {
    DISABLED,
    ALLOWED_ALL,
    ALLOWED_WHITELISTED_FROM,
    ALLOWED_WHITELISTED_TO,
    ALLOWED_WHITELISTED_FROM_TO
}

describe('JoyToken', async () => {
    let owner: SignerWithAddress
    let admin: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let pool1: SignerWithAddress
    let pool2: SignerWithAddress
    let pool3: SignerWithAddress
    let pool4: SignerWithAddress
    let blacklisted: SignerWithAddress
    let whitelisted: SignerWithAddress
    let whitelisted2: SignerWithAddress

    let joyToken: JoyToken

    before(async () => {
        ;[
            owner,
            admin,
            user1,
            user2,
            pool1,
            pool2,
            pool3,
            pool4,
            blacklisted,
            whitelisted,
            whitelisted2,
        ] = await ethers.getSigners()

        let JoyTokenF = await ethers.getContractFactory('JoyToken')
        joyToken = await JoyTokenF.deploy(
            [whitelisted.address, whitelisted2.address],
            [blacklisted.address],
            [admin.address],
            ethers.utils.parseEther('100000')
        )
        await joyToken.deployed()
    })

    describe('Basic functions', async () => {
        it('Only admin add pool information', async () => {
            await expect(
                joyToken.connect(user1).setLPoolInfo(pool1.address, {
                    blacklistedBot: false,
                    swapCooldown: 0,
                })
            ).to.be.reverted
            await expect(
                joyToken.connect(admin).setLPoolInfo(pool1.address, {
                    blacklistedBot: false,
                    swapCooldown: 0,
                })
            ).to.emit(joyToken, 'UpdatedLpList')
        })
        it('Only admin add many pool informations', async () => {
            await expect(
                joyToken.connect(user1).addManyLPoolInfos(
                    [pool1.address],
                    [
                        {
                            blacklistedBot: false, 
                            swapCooldown: 0,
                        },
                    ]
                )
            ).to.be.reverted
            await expect(
                joyToken.connect(admin).addManyLPoolInfos(
                    [
                        pool1.address,
                        pool2.address,
                        pool3.address,
                        pool4.address,
                    ],
                    [
                        {
                            blacklistedBot: false,
                            swapCooldown: 0,
                        },
                        {
                            blacklistedBot: false,
                            swapCooldown: 0,
                        },
                        {
                            blacklistedBot: false,
                            swapCooldown: 0,
                        },
                        {
                            blacklistedBot: false,
                            swapCooldown: ethers.BigNumber.from('10'),
                        },
                    ]
                )
            ).to.emit(joyToken, 'UpdatedLpList')
        })
    })

    describe('Transfer mode checks', async () => {
        it('No transfers possible with transfer mode disabled', async () => {
            await joyToken.setTransferMode(TransferMode.DISABLED)
            await expect(joyToken.transfer(user1.address, ethers.utils.parseEther('1'))).to.be.revertedWithCustomError(joyToken, "DISABLED")
        })

        it('No transfers possible from blacklisted', async () => {
            await joyToken.setTransferMode(TransferMode.ALLOWED_ALL)
            await joyToken.transfer(blacklisted.address, ethers.utils.parseEther('1'))
            
            await joyToken.setTransferMode(TransferMode.ALLOWED_WHITELISTED_FROM)
            await expect(
                joyToken.connect(blacklisted)
                .transfer(user1.address, ethers.utils.parseEther('1'))
            ).to.be.revertedWithCustomError(joyToken, "ALLOWED_WHITELISTED_FROM")
            
            await joyToken.setTransferMode(TransferMode.ALLOWED_WHITELISTED_FROM_TO)
            await expect(
                joyToken
                    .connect(blacklisted)
                    .transfer(user1.address, ethers.utils.parseEther('1'))
            ).to.be.revertedWithCustomError(joyToken, "ALLOWED_WHITELISTED_FROM")

            await joyToken.setTransferMode(TransferMode.ALLOWED_WHITELISTED_TO)
            await expect(
                joyToken.transfer(blacklisted.address, ethers.utils.parseEther('1'))
            ).to.be.revertedWithCustomError(joyToken, "ALLOWED_WHITELISTED_TO")
        })

        it('No transfers possible from blacklisted when on mode ALLOWED_WHITELISTED_FROM', async () => {
            await joyToken.setTransferMode(TransferMode.ALLOWED_ALL)
            await joyToken.transfer(whitelisted.address, ethers.utils.parseEther('10'))

            await joyToken.setTransferMode(TransferMode.ALLOWED_WHITELISTED_FROM)
            await expect(
                joyToken.transfer(user1.address, ethers.utils.parseEther('1'))
            ).to.be.revertedWithCustomError(joyToken, "ALLOWED_WHITELISTED_FROM")

            await expect(
                joyToken.transfer(whitelisted.address,ethers.utils.parseEther('1'))
            ).to.be.revertedWithCustomError(joyToken, "ALLOWED_WHITELISTED_FROM")
        })

        it('Transfers possible from whitelisted when on mode ALLOWED_WHITELISTED_FROM', async () => {
            await joyToken
                .connect(whitelisted)
                .transfer(user1.address, ethers.utils.parseEther('1'))
        })

        it('No transfers possible from blacklisted when on mode ALLOWED_WHITELISTED_FROM_TO', async () => {
            await joyToken.setTransferMode(TransferMode.ALLOWED_WHITELISTED_FROM_TO)
            await expect(
                joyToken.transfer(user1.address, ethers.utils.parseEther('1'))
            ).to.be.revertedWithCustomError(joyToken, "ALLOWED_WHITELISTED_FROM")

            await expect(
                joyToken.transfer(
                    whitelisted.address,
                    ethers.utils.parseEther('1')
                )
            ).to.be.revertedWithCustomError(joyToken, "ALLOWED_WHITELISTED_FROM")
        })

        it('No transfer is possible to whitelisted when on mode ALLOWED_WHITELISTED_FROM_TO and from is not whitelisted', async () => {
            await expect(
                joyToken
                    .connect(whitelisted)
                    .transfer(user1.address, ethers.utils.parseEther('1'))
            ).to.be.revertedWithCustomError(joyToken, "ALLOWED_WHITELISTED_TO")
        })

        it('Transfer is possible to whitelisted when on mode ALLOWED_WHITELISTED_FROM_TO when from is whitelisted', async () => {
            await joyToken
                .connect(whitelisted)
                .transfer(whitelisted2.address, ethers.utils.parseEther('1'))
        })

        it('No transfers possible to non-whitelisted when on mode ALLOWED_WHITELISTED_TO', async () => {
            await joyToken.setTransferMode(TransferMode.ALLOWED_WHITELISTED_TO)
            await expect(
                joyToken.transfer(user1.address, ethers.utils.parseEther('1'))
            ).to.be.revertedWithCustomError(joyToken, "ALLOWED_WHITELISTED_TO")
        })

        it('Transfers possible to whitelisted when on mode ALLOWED_WHITELISTED_TO', async () => {
            await joyToken.transfer(
                whitelisted.address,
                ethers.utils.parseEther('1')
            )
        })
    })

})
