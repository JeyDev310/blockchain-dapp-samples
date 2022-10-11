import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { XJoyToken } from '../../typechain-types/contracts/xJoyToken.sol'

describe('xJoyToken', async () => {
    let owner: SignerWithAddress
    let admin: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress
    let whitelisted: SignerWithAddress
    let blacklisted: SignerWithAddress

    let xJoyToken: XJoyToken

    before(async () => {
        ;[owner, admin, user1, user2, user3, whitelisted, blacklisted] =
            await ethers.getSigners()

        let XJoyTokenF = await ethers.getContractFactory('XJoyToken')
        xJoyToken = await XJoyTokenF.deploy(
            [whitelisted.address],
            [blacklisted.address],
            [admin.address],
            true,
            ethers.utils.parseEther('100000')
        )
        await xJoyToken.deployed()
    })

    describe('Basic functions', async () => {
        it('Owner can send tokens to blacklisted', async () => {
            await expect(
                xJoyToken.transfer(
                    blacklisted.address,
                    ethers.utils.parseEther('1')
                )
            )
                .to.emit(xJoyToken, 'Transfer')
                .withArgs(
                    owner.address,
                    blacklisted.address,
                    ethers.utils.parseEther('1')
                )
        })

        it('Admin can add new admin', async () => {
            await expect(xJoyToken.connect(user1).addAdmin(user2.address)).to.be
                .reverted
            await expect(
                xJoyToken.connect(admin).addAdmin(user2.address)
            ).to.emit(xJoyToken, 'RoleGranted')
        })

        it('Admin can remove admin', async () => {
            await expect(xJoyToken.connect(user1).removeAdmin(user2.address)).to
                .be.reverted
            await expect(
                xJoyToken.connect(admin).removeAdmin(user2.address)
            ).to.emit(xJoyToken, 'RoleRevoked')
        })
    })

    describe('Whitelist/blacklist', async () => {
        it('Admin can add to blacklist', async () => {
            await expect(xJoyToken.connect(user3).addToBlacklist(user1.address))
                .to.be.reverted
            await expect(xJoyToken.connect(admin).addToBlacklist(user1.address))
                .to.emit(xJoyToken, 'Blacklisted')
                .withArgs(user1.address)
        })

        it('Admin can add to whitelist', async () => {
            await expect(xJoyToken.connect(user3).addToWhitelist(user1.address))
                .to.be.reverted
            await expect(xJoyToken.connect(admin).addToWhitelist(user1.address))
                .to.emit(xJoyToken, 'Whitelisted')
                .withArgs(user1.address)
        })

        it('Admin can remove from blacklist', async () => {
            await expect(
                xJoyToken.connect(user3).removeFromBlacklist(user1.address)
            ).to.be.reverted
            await expect(
                xJoyToken.connect(admin).removeFromBlacklist(user1.address)
            )
                .to.emit(xJoyToken, 'RemovedFromBlacklist')
                .withArgs(user1.address)
        })

        it('Admin can remove from whitelist', async () => {
            await expect(
                xJoyToken.connect(user3).removeFromWhitelist(user1.address)
            ).to.be.reverted
            await expect(
                xJoyToken.connect(admin).removeFromWhitelist(user1.address)
            )
                .to.emit(xJoyToken, 'RemovedFromWhitelist')
                .withArgs(user1.address)
        })

        it('Admin can add many to blacklist', async () => {
            await expect(
                xJoyToken
                    .connect(user3)
                    .addManyToBlacklist([user1.address, user2.address])
            ).to.be.reverted
            await expect(
                xJoyToken
                    .connect(admin)
                    .addManyToBlacklist([user1.address, user2.address])
            ).to.emit(xJoyToken, 'BlacklistedMany')

            await xJoyToken.removeFromBlacklist(user1.address)
            await xJoyToken.removeFromBlacklist(user2.address)
        })

        it('Admin can add many to whitelist', async () => {
            await expect(
                xJoyToken
                    .connect(user3)
                    .addManyToWhitelist([user1.address, user2.address])
            ).to.be.reverted
            await expect(
                xJoyToken
                    .connect(admin)
                    .addManyToWhitelist([user1.address, user2.address])
            ).to.emit(xJoyToken, 'WhitelistedMany')

            await xJoyToken.removeFromWhitelist(user1.address)
            await xJoyToken.removeFromWhitelist(user2.address)
        })

        it('Blacklisted user cannot send tokens out', async () => {
            await expect(
                xJoyToken
                    .connect(blacklisted)
                    .transfer(user1.address, ethers.utils.parseEther('1'))
            ).to.be.reverted
        })

        it('Blacklisted user can send tokens to whitelisted address', async () => {
            await expect(
                xJoyToken
                    .connect(blacklisted)
                    .transfer(whitelisted.address, ethers.utils.parseEther('1'))
            )
                .to.emit(xJoyToken, 'Transfer')
                .withArgs(
                    blacklisted.address,
                    whitelisted.address,
                    ethers.utils.parseEther('1')
                )
        })
    })
})
