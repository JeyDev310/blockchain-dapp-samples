import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'
import { Wallet, Contract, ContractInterface, utils, Bytes } from 'ethers'
import { expect } from 'chai'
// import { Multicall, ContractCallResults, ContractCallContext } from 'ethereum-multicall';
import { ethers } from 'hardhat'
import { impersonateAccount } from "../../../utils/impersonateAccount";

const toEth: Function = (value: string) => ethers.utils.parseEther(value).toString()
const signerWrapper = (privKey: string, provider: any) => new Wallet(privKey, provider)
const BN_From = (number: string | number) => ethers.BigNumber.from(number)

const { pKowner, ALCHEMY_MAINNET } = process.env
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')
const owner = signerWrapper(pKowner ?? '', provider)
console.log('owner', owner.address)


describe('Deploying Joy, xJoy, Presale V2', async () => {
    let MIGRATOR: Contract;
    before(async () => {
        await impersonateAccount(provider, owner.address);
    })

    describe('Basic Setup', async () => {
        it("Should give us gas costs fors migrator deployment", async () => {
            let Migrator = await ethers.getContractFactory('JOY_Migrator')
            MIGRATOR = await Migrator.connect(owner).deploy()
            await MIGRATOR.deployed()
            console.log('Migrator Address', MIGRATOR.address)
        })
    })

})