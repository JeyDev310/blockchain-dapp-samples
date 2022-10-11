import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Wallet, Contract } from "ethers";
import { ethers } from 'hardhat'
import { XJoyToken } from '../../../typechain-types/contracts/xJoyToken.sol'
import { impersonateAccount } from "../../../utils/impersonateAccount";

const {
    ALCHEMY_MAINNET, ALCHEMY_GOERLI, PRIVATE_KEY,
    pKowner, pKadmin, pKuser1, pKuser2, pKpool1, pKpool2, pKpool3, pKpool4, pKblacklisted, pKwhitelisted, pKwhitelisted2
} = process.env;

const toBn: Function = (value: string) => ethers.BigNumber.from(value)
const toEth: Function = (value: string) => ethers.utils.parseEther(value).toString()
const getAddress = (pubKey: string) => ethers.utils.getAddress(pubKey)
const signerWrapper = (privKey: string, provider: any) => new Wallet(privKey, provider);

const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

let owner = signerWrapper(pKowner ?? "", provider);
let admin = signerWrapper(pKadmin ?? "", provider);
let user1 = signerWrapper(pKuser1 ?? "", provider);
let user2 = signerWrapper(pKuser2 ?? "", provider);
let user3 = signerWrapper(pKpool1 ?? "", provider);
let pool2 = signerWrapper(pKpool2 ?? "", provider);
let pool3 = signerWrapper(pKpool3 ?? "", provider);
let pool4 = signerWrapper(pKpool4 ?? "", provider);
let blacklisted = signerWrapper(pKblacklisted ?? "", provider);
let whitelisted = signerWrapper(pKwhitelisted ?? "", provider);
let whitelisted2 = signerWrapper(pKwhitelisted2 ?? "", provider);

describe('xJoyToken', async () => {
    let xJoyToken: XJoyToken
    
    before(async () => {
        await impersonateAccount(provider, owner.address);
        await impersonateAccount(provider, admin.address);
        await impersonateAccount(provider, user1.address);
        await impersonateAccount(provider, user2.address);
        await impersonateAccount(provider, user3.address);
        await impersonateAccount(provider, pool2.address);
        await impersonateAccount(provider, pool3.address);
        await impersonateAccount(provider, pool4.address);
        await impersonateAccount(provider, blacklisted.address);
        await impersonateAccount(provider, whitelisted.address);
        await impersonateAccount(provider, whitelisted2.address);
        
        let XJoyTokenF = await ethers.getContractFactory('XJoyToken')
        xJoyToken = await XJoyTokenF.connect(owner).deploy(
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
            await expect(xJoyToken.connect(user1).addAdmin(user2.address))
                .eventually.to.be.rejected
            await expect(
                xJoyToken.connect(admin).addAdmin(user2.address)
            ).to.emit(xJoyToken, 'RoleGranted')
        })

        it('Admin can remove admin', async () => {
            await expect(xJoyToken.connect(user1).removeAdmin(user2.address))
                .eventually.to.be.rejected
            await expect(
                xJoyToken.connect(admin).removeAdmin(user2.address)
            ).to.emit(xJoyToken, 'RoleRevoked')
        })
    })

    describe('Whitelist/blacklist', async () => {
        it('Admin can add to blacklist', async () => {
            await expect(xJoyToken.connect(user3).addToBlacklist(user1.address))
                .eventually.to.be.rejected
            await expect(xJoyToken.connect(admin).addToBlacklist(user1.address))
                .to.emit(xJoyToken, 'Blacklisted')
                .withArgs(user1.address)
        })

        it('Admin can add to whitelist', async () => {
            await expect(xJoyToken.connect(user3).addToWhitelist(user1.address))
                .eventually.to.be.rejected
            await expect(xJoyToken.connect(admin).addToWhitelist(user1.address))
                .to.emit(xJoyToken, 'Whitelisted')
                .withArgs(user1.address)
        })

        it('Admin can remove from blacklist', async () => {
            await expect(
                xJoyToken.connect(user3).removeFromBlacklist(user1.address)
            ).eventually.to.be.rejected
            await expect(
                xJoyToken.connect(admin).removeFromBlacklist(user1.address)
            )
                .to.emit(xJoyToken, 'RemovedFromBlacklist')
                .withArgs(user1.address)
        })

        it('Admin can remove from whitelist', async () => {
            await expect(
                xJoyToken.connect(user3).removeFromWhitelist(user1.address)
            ).eventually.to.be.rejected
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
            ).eventually.to.be.rejected
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
            ).eventually.to.be.rejected
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
            ).eventually.to.be.rejected
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
