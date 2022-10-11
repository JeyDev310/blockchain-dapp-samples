import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'

import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-etherscan'
import 'hardhat-gas-reporter'
import 'solidity-coverage'

import dotenv from 'dotenv'
dotenv.config()

const { ALCHEMY_MAINNET, PRIVATE_KEY, PRIVATE_KEY_MIGRATOR, REPORT_GAS, ETHERSCAN_API_KEY, CMC } =
    process.env

const config: HardhatUserConfig = {
    networks: {
        ethLocalFork: {
            url: 'http://127.0.0.1:8545/',
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
        },
        hardhat: {
            forking: {
                url: ALCHEMY_MAINNET ?? '',
            },
        },
        mainnet: {
            url: ALCHEMY_MAINNET,
            // accounts: PRIVATE_KEY_MIGRATOR !== undefined ? [PRIVATE_KEY_MIGRATOR] : [],
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            gasPrice: 40000000000 // 40 GWEI
        }
    },
    mocha: {
        timeout: 100000000
    },
    gasReporter: {
        enabled: REPORT_GAS ? true : false,
        coinmarketcap: CMC,
        currency: 'USD',
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    solidity: {
        compilers: [
            {
                version: '0.8.11',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1337,
                    },
                },
            },
            {
                version: '0.6.12',
            },
        ],
    },
    paths: {
        sources: './contracts',
        artifacts: './artifacts',
        cache: './cache',
        tests: './test',
    },
}

export default config
