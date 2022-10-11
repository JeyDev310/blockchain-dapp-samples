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
    let MULTICALL2_ADDRESS: string = "0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696";
    let FACTORY_ADDRESS: string = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    let ROUTER_ADDRESS: string = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    let USDC_ADDRESS: string = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    let USDC: Contract;
    let UNI_ROUTER: Contract;
    let JOY_USDC_PAIR: Contract;
    let UNI_FACTORY: Contract;
    let ARBITRAGE: Contract;
    let MULTICALL: Contract;

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

        // console.log('ran up to here')
        // Feed users with some fake coins
        await joyToken.connect(owner).mint(owner.address, ethers.utils.parseEther("100000000"));
        // console.log('USDC.balanceOf(owner.address)', await USDC.balanceOf(owner.address))
        await USDC.connect(owner).transfer(user1.address, 200 * 1e6);
        await USDC.connect(owner).transfer(user2.address, 100 * 1e6);
        // console.log('USDC.balanceOf(user1.address)', await USDC.balanceOf(user1.address))

        const block = await ethers.provider.getBlock("latest");
        const deadline = Math.floor(block.timestamp) // now + 1 minute

        // console.log('await USDC.balanceOf(owner.address)', await USDC.balanceOf(owner.address));

        // console.log('ran after saleStart')

        await USDC.connect(owner).approve(UNI_ROUTER.address, 50 * 1e6)
        await joyToken.connect(owner).approve(UNI_ROUTER.address, toEth("20"))

        // console.log('ran after approve')

        // console.log('before liquidity ')
        await UNI_FACTORY.connect(owner).createPair(joyToken.address, USDC_ADDRESS)

        // console.log('ran after createPair')

        const tx = await UNI_ROUTER.connect(owner).addLiquidity(
            joyToken.address,  // address tokenA,
            USDC_ADDRESS,      // address tokenB,
            toEth('10'),       // uint256 amountADesired,
            10 * 1e6,          // uint256 amountBDesired,
            toEth('10'),       // usdcAddress
            10 * 1e6,          // receiver
            owner.address, // address to,
            deadline + 60,     // uint256 deadline
        );
        await tx.wait();

        // console.log('ran after adding liquidity')

        const SWAP_PAIR = await UNI_FACTORY.getPair(joyToken.address, USDC_ADDRESS);

        JOY_USDC_PAIR = await ethers.getContractAt("IUniswapV2Pair", SWAP_PAIR, owner);
        
        // console.log('ran JOY_USDC_PAIR', JOY_USDC_PAIR)
        // console.log('ran IUniswapV2Pair')

        const ARBITRAGE_FACTORY = await ethers.getContractFactory('Arbitrage')
        ARBITRAGE = await ARBITRAGE_FACTORY.connect(owner).deploy()
        await ARBITRAGE.deployed()

        console.log('ARBITRAGE', ARBITRAGE.address)
        console.log('joyToken', joyToken.address)
        console.log('await ARBITRAGE.owner()', await ARBITRAGE.owner())
        console.log('JOY_USDC_PAIR.address', JOY_USDC_PAIR.address)

        await joyToken.setProtectedSwaps(true);

        // console.log('ran at the end')
    })

    describe('Check if BASE_ASSET can be arbitraged', async () => {
        it("BASIC SETUP", async () => {
            await expect(joyToken.connect(owner).transfer(ARBITRAGE.address, ethers.utils.parseEther("1000"))).to.emit(joyToken, 'Transfer');
            await expect(joyToken.connect(owner).approve(UNI_ROUTER.address, ethers.utils.parseEther("1000"))).to.emit(joyToken, 'Approval');
            await expect(USDC.connect(owner).transfer(ARBITRAGE.address, 100 * 1e6)).to.emit(USDC, 'Transfer');
            await expect(USDC.connect(owner).approve(UNI_ROUTER.address, 100 * 1e6)).to.emit(USDC, 'Approval');
            // console.log('await joyToken.balanceOf(ARBITRAGE.address)', await joyToken.balanceOf(ARBITRAGE.address))
            // console.log('await USDC.balanceOf(ARBITRAGE.address)', await USDC.balanceOf(ARBITRAGE.address))
            // console.log('await USDC.balanceOf(UNI_ROUTER.address)', await USDC.balanceOf(UNI_ROUTER.address))
        });

        it("Can swap JOY token once in the same block from External Smart Contract", async () => {
            let token0 = await JOY_USDC_PAIR.token0();
            let token1 = await JOY_USDC_PAIR.token1();
            if (token0 == USDC_ADDRESS) {
                // console.log('ran ARBITRAGE.swap() token0')
                await expect(ARBITRAGE.connect(owner).swap(UNI_ROUTER.address, token0, token1, 1 * 1e6)).not.be.rejected
            }
            if (token1 == USDC_ADDRESS) {
                // console.log('ran ARBITRAGE.swap() token1')
                await expect(ARBITRAGE.connect(owner).swap(UNI_ROUTER.address, token1, token0, 1 * 1e6)).not.be.rejected
            }
        });
        
        it("Can't swap JOY tokens twice in same block", async () => {
            let token0 = await JOY_USDC_PAIR.token0();
            let token1 = await JOY_USDC_PAIR.token1();
            if (token0 == USDC_ADDRESS) {
                // console.log('ran ARBITRAGE.dualDexTrade() token0')
                await expect(ARBITRAGE.connect(owner).dualDexTrade(UNI_ROUTER.address, token0, token1, 1 * 1e6)).to.be.rejected
            }
            if (token1 == USDC_ADDRESS) {
                // console.log('ran ARBITRAGE.dualDexTrade() token1')
                await expect(ARBITRAGE.connect(owner).dualDexTrade(UNI_ROUTER.address, token1, token0, 1 * 1e6)).to.be.rejected
            }
        });

        it("Can't swap JOY tokens twice in same block even if it is to external address", async () => {
            let token0 = await JOY_USDC_PAIR.token0();
            let token1 = await JOY_USDC_PAIR.token1();
            if (token0 == USDC_ADDRESS) {
                // console.log('ran ARBITRAGE.dualDexTradeToEOA() token1')
                await expect(ARBITRAGE.connect(owner).dualDexTradeToEOA(UNI_ROUTER.address, token0, token1, 1 * 1e6, owner.address)).to.be.rejected
            }
            if (token1 == USDC_ADDRESS) {
                // console.log('ran ARBITRAGE.dualDexTradeToEOA() token1')
                await expect(ARBITRAGE.connect(owner).dualDexTradeToEOA(UNI_ROUTER.address, token1, token0, 1 * 1e6, owner.address)).to.be.rejected
            }
        });
        
        it('Should check if swap made in different blocks still work', async () => {
            await expect(await USDC.connect(owner).transfer(joyToken.address, 10 * 1e6)).to.emit(USDC, 'Transfer');
            await joyToken.connect(owner).transfer(joyToken.address, toEth("10"))
            await joyToken.connect(owner).approve(ROUTER_ADDRESS, toEth("10"))

            const block = await ethers.provider.getBlock("latest");
            const deadline = Math.floor(block.timestamp) // now + 1 minute

            // const initialArbBalanceJOY = await joyToken.balanceOf(ARBITRAGE.address)
            // const initialArbBalanceUSDC = await USDC.balanceOf(ARBITRAGE.address)

            await expect(UNI_ROUTER.connect(owner).swapExactTokensForTokens(
                toEth("0.1"),
                0,
                [joyToken.address, USDC.address],
                owner.address,
                deadline + 10
            )).not.to.be.rejected

            await expect(UNI_ROUTER.connect(owner).swapExactTokensForTokens(
                toEth("0.1"),
                0,
                [joyToken.address, USDC.address],
                owner.address,
                deadline + 20
            )).not.to.be.rejected

            await expect(UNI_ROUTER.connect(owner).swapExactTokensForTokens(
                toEth("0.1"),
                0,
                [joyToken.address, USDC.address],
                owner.address,
                deadline + 30
            )).not.to.be.rejected
        })
    })

})
