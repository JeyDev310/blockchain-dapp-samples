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
const toEth: Function = (value: any) => ethers.utils.parseEther(value)
const formatEther: Function = (value: any) => ethers.utils.formatEther(value)
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
    let FACTORY_ADDRESS: string = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    let ROUTER_ADDRESS: string = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    let JOYV1_ADDRESS: string = "0xdb4D1099D53e92593430e33483Db41c63525f55F";
    let WETH_ADDRESS: string = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
    let joyTokenV1: Contract
    let WETH: Contract;
    let UNI_FACTORY: Contract;
    let UNI_ROUTER: Contract;
    let JOY_USDC_PAIR: Contract;

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
        WETH = await ethers.getContractAt("IWETH", WETH_ADDRESS, owner);
        joyTokenV1 = await ethers.getContractAt("IWETH", JOYV1_ADDRESS, owner);

        const SWAP_PAIR = await UNI_FACTORY.getPair(JOYV1_ADDRESS, WETH_ADDRESS);

        JOY_USDC_PAIR = await ethers.getContractAt("IUniswapV2Pair", SWAP_PAIR, owner);
        console.log('JOY_USDC_PAIR.address', JOY_USDC_PAIR.address)
    })

    describe('Check if BASE_ASSET can be arbitraged', async () => {
        it("BASIC SETUP", async () => {
            const V1_BALANCE_JOY = await joyTokenV1.balanceOf("0x0a4ccfdc42013bd01420cc8aa1e34e77ce28c580")
            const V1_BALANCE_WETH = await WETH.balanceOf("0x0a4ccfdc42013bd01420cc8aa1e34e77ce28c580")
            const V1_TOTAL_LP_SUPPLY = await JOY_USDC_PAIR.totalSupply();
            console.log("Total LP Supply", formatEther((V1_TOTAL_LP_SUPPLY).toString()));
            console.log("Total JOY1 Balance", formatEther((V1_BALANCE_JOY).toString()));
            console.log("Total WETH Balance", formatEther((V1_BALANCE_WETH).toString()));
            expect(true);
        });
    })

})
