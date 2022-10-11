import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Wallet, Contract } from "ethers";
import { JoyToken } from '../../../typechain-types/contracts'
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
let pool1 = signerWrapper(pKpool1 ?? "", provider);
let pool2 = signerWrapper(pKpool2 ?? "", provider);
let pool3 = signerWrapper(pKpool3 ?? "", provider);
let pool4 = signerWrapper(pKpool4 ?? "", provider);
let blacklisted = signerWrapper(pKblacklisted ?? "", provider);
let whitelisted = signerWrapper(pKwhitelisted ?? "", provider);
let whitelisted2 = signerWrapper(pKwhitelisted2 ?? "", provider);

enum TransferMode {
    DISABLED,
    ALLOWED_ALL,
    ALLOWED_WHITELISTED_FROM,
    ALLOWED_WHITELISTED_TO,
    ALLOWED_WHITELISTED_FROM_TO,
}

describe('JoyToken', async () => {
    let joyToken: JoyToken
    let FACTORY_ADDRESS: string = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    let ROUTER_ADDRESS: string = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    let USDC_ADDRESS: string = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    let USDC: Contract;
    let UNI_ROUTER: Contract;
    let JOY_USDC_PAIR: Contract;
    let UNI_FACTORY: Contract;

    before(async () => {
        await impersonateAccount(provider, owner.address);
        await impersonateAccount(provider, admin.address);
        await impersonateAccount(provider, user1.address);
        await impersonateAccount(provider, user2.address);
        await impersonateAccount(provider, pool1.address);
        await impersonateAccount(provider, pool2.address);
        await impersonateAccount(provider, pool3.address);
        await impersonateAccount(provider, pool4.address);
        await impersonateAccount(provider, blacklisted.address);
        await impersonateAccount(provider, whitelisted.address);
        await impersonateAccount(provider, whitelisted2.address);

        UNI_FACTORY = await ethers.getContractAt("IUniswapFactory", FACTORY_ADDRESS, owner);
        UNI_ROUTER = await ethers.getContractAt("IUniswapRouter02", ROUTER_ADDRESS, owner);
        USDC = await ethers.getContractAt("IWETH", USDC_ADDRESS, owner);

        let JoyTokenF = await ethers.getContractFactory('JoyToken')
        joyToken = await JoyTokenF.connect(owner).deploy(
            [whitelisted.address, whitelisted2.address],
            [blacklisted.address],
            [admin.address]
        )
        await joyToken.deployed()

        console.log('ran up to here')
        // Feed users with some fake coins
        await joyToken.connect(owner).mint(owner.address, ethers.utils.parseEther("100000000"));
        console.log('USDC.balanceOf(owner.address)', await USDC.balanceOf(owner.address))
        await USDC.connect(owner).transfer(user1.address, 200 * 1e6);
        await USDC.connect(owner).transfer(user2.address, 100 * 1e6);
        console.log('USDC.balanceOf(user1.address)', await USDC.balanceOf(user1.address))

        const block = await ethers.provider.getBlock("latest");
        const deadline = Math.floor(block.timestamp) // now + 1 minute

        console.log('await USDC.balanceOf(owner.address)', await USDC.balanceOf(owner.address));

        console.log('ran after saleStart')

        await USDC.connect(owner).approve(UNI_ROUTER.address, 50 * 1e6)
        await joyToken.connect(owner).approve(UNI_ROUTER.address, toEth("20"))

        console.log('ran after approve')

        // console.log('before liquidity ')
        await UNI_FACTORY.connect(owner).createPair(joyToken.address, USDC_ADDRESS)

        console.log('ran after createPair')

        const tx = await UNI_ROUTER.connect(owner).addLiquidity(
            joyToken.address, // address tokenA,
            USDC_ADDRESS,     // address tokenB,
            toEth('10'),      // uint256 amountADesired,
            10 * 1e6,         // uint256 amountBDesired,
            toEth('10'),      // usdcAddress
            10 * 1e6,         // receiver
            owner.address,    // address to,
            deadline + 60,    // uint256 deadline
        );
        await tx.wait();

        console.log('ran after adding liquidity')

        const SWAP_PAIR = await UNI_FACTORY.getPair(joyToken.address, USDC_ADDRESS);

        JOY_USDC_PAIR = await ethers.getContractAt("IUniswapV2Pair", SWAP_PAIR, owner);

        console.log('ran after JOY USDC PAIR')

        await joyToken.setProtectedSwaps(true);

        console.log('ran at the end')
    })

    describe('Transfer mode checks', async () => {
        it('No transfers possible with transfer mode disabled', async () => {
            await joyToken.setTransferMode(TransferMode.DISABLED)
            await expect(joyToken.transfer(user1.address, ethers.utils.parseEther('1'))).eventually.to.rejected
        })

        it('No transfers possible from blacklisted', async () => {
            await joyToken.setTransferMode(TransferMode.ALLOWED_ALL)
            await joyToken.transfer(blacklisted.address, toEth('1'))

            await joyToken.setTransferMode(TransferMode.ALLOWED_WHITELISTED_FROM)
            await expect(
                joyToken.connect(blacklisted)
                .transfer(user1.address, toEth('1'))
            ).eventually.to.rejected
            
            await joyToken.setTransferMode(TransferMode.ALLOWED_WHITELISTED_FROM_TO)
            await expect(
                joyToken.connect(blacklisted)
                .transfer(user1.address, toEth('1'))
            ).eventually.to.rejected
            
            await joyToken.setTransferMode(TransferMode.ALLOWED_WHITELISTED_TO)
            await expect(
                joyToken.transfer(blacklisted.address, toEth('1'))
            ).eventually.to.rejected
        })

        it('No transfers possible from blacklisted when on mode ALLOWED_WHITELISTED_FROM', async () => {
            await joyToken.connect(owner).setTransferMode(TransferMode.ALLOWED_ALL)
            await joyToken.connect(owner).transfer(
                whitelisted.address,
                toEth('10')
            )
            await joyToken.connect(owner).setTransferMode(
                TransferMode.ALLOWED_WHITELISTED_FROM
            )

            await expect(
                joyToken.transfer(user1.address, toEth('1'))
            ).eventually.to.rejected

            await expect(
                joyToken.transfer(
                    whitelisted.address,
                    toEth('1')
                )
            ).eventually.to.rejected
        })

        it('Transfers possible from whitelisted when on mode ALLOWED_WHITELISTED_FROM', async () => {
            await joyToken
                .connect(whitelisted)
                .transfer(user1.address, toEth('1'))
        })

        it('No transfers possible from blacklisted when on mode ALLOWED_WHITELISTED_FROM_TO', async () => {
            await joyToken.setTransferMode(
                TransferMode.ALLOWED_WHITELISTED_FROM_TO
            )
            await expect(
                joyToken.transfer(user1.address, toEth('1'))
            ).eventually.to.rejected

            await expect(
                joyToken.transfer(
                    whitelisted.address,
                    toEth('1')
                )
            ).eventually.to.rejected
        })

        it('No transfer is possible to whitelisted when on mode ALLOWED_WHITELISTED_FROM_TO and from is not whitelisted', async () => {
            await expect(
                joyToken
                    .connect(whitelisted)
                    .transfer(user1.address, toEth('1'))
            ).eventually.to.rejected
        })

        it('Transfer is possible to whitelisted when on mode ALLOWED_WHITELISTED_FROM_TO when from is whitelisted', async () => {
            await joyToken
                .connect(whitelisted)
                .transfer(whitelisted2.address, toEth('1'))
        })

        it('No transfers possible to non-whitelisted when on mode ALLOWED_WHITELISTED_TO', async () => {
            await joyToken.setTransferMode(TransferMode.ALLOWED_WHITELISTED_TO)
            await expect(
                joyToken.transfer(user1.address, toEth('1'))
            ).eventually.to.rejected
        })

        it('Transfers possible to whitelisted when on mode ALLOWED_WHITELISTED_TO', async () => {
            await joyToken.transfer(
                whitelisted.address,
                toEth('1')
            )
        })

        it('Transfers possible to registered pool when trading allowed', async () => {
            await joyToken.setTransferMode(TransferMode.ALLOWED_ALL)

            await joyToken.transfer(
                pool1.address,
                toEth('10')
            )
        })

        it('Transfers possible from registered pool when trading allowed', async () => {
            await joyToken
                .connect(pool1)
                .transfer(owner.address, toEth('1'))
        })
    })

    describe('Initial liquidity and swap cooldown checks', async () => {
        it('Should transfer USDC and JOY inside JoyToken Smart Contract', async () => {
            console.log('await USDC.balanceOf(owner.address)', await USDC.balanceOf(owner.address));
            await expect(await USDC.connect(owner).transfer(joyToken.address, 10 * 1e6)).to.emit(USDC, 'Transfer');
            await joyToken.connect(owner).transfer(joyToken.address, toEth("10"))
        });

        it('Should check if swap cooldown is enforced for JOY/USDC Pair', async () => {
            await joyToken.connect(owner).approve(ROUTER_ADDRESS, toEth("10"))

            const block = await ethers.provider.getBlock("latest");
            const deadline = Math.floor(block.timestamp) // now + 1 minute

            const swap1 = await UNI_ROUTER.connect(owner).swapExactTokensForTokens(
                toEth("0.1"),
                0,
                [joyToken.address, USDC.address],
                owner.address,
                deadline + 10
            )
            await swap1.wait();

            const swap2 = await UNI_ROUTER.connect(owner).swapExactTokensForTokens(
                toEth("0.1"),
                0,
                [joyToken.address, USDC.address],
                owner.address,
                deadline + 20
            )
            await swap2.wait();

            const swap3 = await UNI_ROUTER.connect(owner).swapExactTokensForTokens(
                toEth("0.1"),
                0,
                [joyToken.address, USDC.address],
                owner.address,
                deadline + 30
            )
            await swap3.wait();

            const getFinalReserves = await JOY_USDC_PAIR.getReserves()
            const realPrice = (Number(getFinalReserves.reserve0) / Number(getFinalReserves.reserve1) * 1e12)
            const discount_55 = realPrice / 1.55 // 55% discount
            console.log('getFinalReserves', getFinalReserves)
            console.log('realPrice', realPrice)
            console.log('discount_55', discount_55)
        })
    })
})
