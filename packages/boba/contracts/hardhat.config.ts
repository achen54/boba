import { HardhatUserConfig } from 'hardhat/types'
import 'solidity-coverage'
import * as dotenv from 'dotenv'

// Hardhat plugins
import 'hardhat-deploy'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
import './tasks/deploy'

// Load environment variables from .env
dotenv.config()

// Fix lint
if (!process.env.L1_NODE_WEB3_URL) {
  process.env.L1_NODE_WEB3_URL = 'http://localhost:9545'
}

const config: HardhatUserConfig = {
  mocha: {
    timeout: 300000,
  },
  networks: {
    boba: {
      url: 'http://localhost:8545',
      saveDeployments: false,
    },
    localhost: {
      url: 'http://localhost:9545',
      allowUnlimitedContractSize: true,
      timeout: 1800000,
      accounts: [
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      ],
    },
    mainnet: {
      url: process.env.L1_NODE_WEB3_URL,
    },
    'boba-mainnet': {
      url: 'https://mainnet.boba.network',
    },
    moonbeam: {
      url: 'https://rpc.api.moonbeam.network',
    },
    bobabeam: {
      url: 'https://bobabeam.boba.network',
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: { enabled: true, runs: 10_000 },
          metadata: {
            bytecodeHash: 'none',
          },
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
            },
          },
        },
      },
      {
        version: '0.6.6', // Required for oracle
        settings: {
          optimizer: { enabled: true, runs: 10_000 },
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
            },
          },
        },
      },
      {
        version: '0.5.17', // Required for WETH9
        settings: {
          optimizer: { enabled: true, runs: 10_000 },
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
            },
          },
        },
      },
      {
        version: '0.4.11', // Required for OMGLIkeToken
        settings: {
          optimizer: { enabled: true, runs: 10_000 },
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
            },
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_KEY,
      'boba-mainnet': process.env.BOBA_MAINNET_KEY,
      moonbeam: process.env.MOONBEAM_KEY,
      bobabeam: 'DEFAULT_KEY',
    },
    customChains: [
      {
        network: 'boba-mainnet',
        chainId: 288,
        urls: {
          apiURL: 'https://api.bobascan.com/api',
          browserURL: 'https://bobascan.com',
        },
      },
      {
        network: 'moonbeam',
        chainId: 1284,
        urls: {
          apiURL: 'https://api-moonbeam.moonscan.io/api',
          browserURL: 'https://moonscan.io/',
        },
      },
      {
        network: 'bobabeam',
        chainId: 1294,
        urls: {
          apiURL: 'https://blockexplorer.bobabeam.boba.network/api',
          browserURL: 'https://blockexplorer.bobabeam.boba.network/',
        },
      },
    ],
  },
}

export default config
