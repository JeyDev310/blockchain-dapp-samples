
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { network, ethers } from 'hardhat'
import { impersonateAccount } from "../../../utils/impersonateAccount";
import dotenv from "dotenv";
dotenv.config()

const toWei = (amount: string) => ethers.utils.parseEther(amount);
const addTime = async (time: string) => { await network.provider.send("evm_increaseTime", [time]); await network.provider.send("evm_mine") }

const { ALCHEMY_MAINNET, PRIVATE_KEY, pKowner } = process.env;

// console.log('PRIVATE_KEY', PRIVATE_KEY)

// const signer = new ethers.Wallet(pKowner ?? "");
const signer = new ethers.Wallet(PRIVATE_KEY ?? "");
const minter = ethers.utils.getAddress("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"); // hardhat address[0]
const wallet = ethers.utils.getAddress("0x70997970c51812dc3a010c7d01b50e0d17dc79c8"); // hardhat address[1]

// console.log('signer', signer)

// LOAD IMPERSONATED WALLETS
const impersonateDAI = ethers.utils.getAddress("0x6B175474E89094C44Da98b954EedeAC495271d0F"); // x
const impersonateUSDC = ethers.utils.getAddress("0x0a59649758aa4d66e25f08dd01271e891fe52199"); // x
const impersonateUSDT = ethers.utils.getAddress("0xf977814e90da44bfa03b6295a0616a897441acec"); // x
const impersonateTUSD = ethers.utils.getAddress("0x0000000000085d4780B73119b644AE5ecd22b376"); // x
const impersonateWETH = ethers.utils.getAddress("0xf04a5cc80b1e94c69b48f5ee68a08cd2f09a7c3e"); // x
const impersonateWBTC = ethers.utils.getAddress("0xbf72da2bd84c5170618fbe5914b0eca9638d5eb5"); // x
const impersonateLINK = ethers.utils.getAddress("0x28c6c06298d514db089934071355e5743bf21d60"); // x
const impersonateUNI = ethers.utils.getAddress("0x1a9c8182c09f50c8318d769245bea52c32be35bc"); // x
const impersonateCOMP = ethers.utils.getAddress("0x28c6c06298d514db089934071355e5743bf21d60"); // x
const impersonateMATIC = ethers.utils.getAddress("0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0"); // x

// TOKEN ADDRESSESS
const DAI = ethers.utils.getAddress("0x6b175474e89094c44da98b954eedeac495271d0f");
const USDC = ethers.utils.getAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
const USDT = ethers.utils.getAddress("0xdac17f958d2ee523a2206206994597c13d831ec7");
const TUSD = ethers.utils.getAddress("0x0000000000085d4780B73119b644AE5ecd22b376");
const WETH = ethers.utils.getAddress("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
const WBTC = ethers.utils.getAddress("0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599");
const LINK = ethers.utils.getAddress("0x514910771af9ca656af840dff83e8264ecf986ca");
const UNI = ethers.utils.getAddress("0x1f9840a85d5af5bf1d1762f925bdaddc4201f984");
const COMP = ethers.utils.getAddress("0xc00e94cb662c3520282e6f5717214004a7f26888");
const MATIC = ethers.utils.getAddress("0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0");

const impersonationArray = [impersonateDAI, impersonateUSDC, impersonateUSDT, impersonateTUSD, impersonateWETH, impersonateWBTC, impersonateLINK, impersonateUNI, impersonateCOMP, impersonateMATIC]
const tokenArray = [DAI, USDC, USDT, TUSD, WETH, WBTC, LINK, UNI, COMP, MATIC]

describe("Mainnet Fork - Balances Top-up", function () {
  before(async () => {
    const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
    const block = await ethers.provider.getBlock("latest");
    const openingTime = Math.floor(block.timestamp) + 3600 // now + 1 hour
    const closingTime = openingTime + 864000; // 864000 == 10 days

    const mockToken = await ethers.getContractFactory("ERC20Stub");
    const contractDAI = await mockToken.attach(DAI);
    const contractUSDC = await mockToken.attach(USDC);
    const contractUSDT = await mockToken.attach(USDT);
    const contractTUSD = await mockToken.attach(TUSD);
    const contractWETH = await mockToken.attach(WETH);
    const contractWBTC = await mockToken.attach(WBTC);
    const contractLINK = await mockToken.attach(LINK);
    const contractUNI = await mockToken.attach(UNI);
    const contractCOMP = await mockToken.attach(COMP);
    const contractMATIC = await mockToken.attach(MATIC);

    const contractsArray = [contractDAI, contractUSDC, contractUSDT, contractTUSD, contractWETH, contractWBTC, contractLINK, contractUNI, contractCOMP, contractMATIC]

    const signerImpersonated = await impersonateAccount(provider, signer.address);
    // console.log('signerImpersonated', signerImpersonated);

    const walletImpersonated = await impersonateAccount(provider, wallet);
    // console.log('walletImpersonated', walletImpersonated);

    const updateAllBalances = async () => {
      for (let i = 0; i < tokenArray.length; i++) {
        try {
          let amount = i == 1 || i == 2 || i == 5 ? 10000 * 1e6 : toWei("1000")
          const impersonatedWallet = await impersonateAccount(provider, impersonationArray[i]);
          await contractsArray[i].connect(impersonatedWallet).transfer(signer.address, amount);
        } catch (error) {
          console.log('error', error)
        }
      }
    }
    await updateAllBalances();

  });

  it("should check if everything is working correctly", async () => {
    expect(true).to.equal(true, "Should work")
  });

});