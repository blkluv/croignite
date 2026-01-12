import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition-ethers";
import * as dotenv from "dotenv";
import path from "node:path";
import type { HardhatUserConfig } from "hardhat/config";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const privateKey = process.env.PRIVATE_KEY;
const accounts = privateKey ? [privateKey] : [];
const cronosExplorerApiKey = process.env.CRONOS_EXPLORER_API_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  defaultNetwork: "cronosTestnet",
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    cronos: {
      url: "https://evm.cronos.org",
      chainId: 25,
      accounts,
    },
    cronosTestnet: {
      url: "https://evm-t3.cronos.org",
      chainId: 338,
      accounts,
    },
  },
  etherscan: {
    apiKey: {
      cronos: cronosExplorerApiKey,
      cronosTestnet: cronosExplorerApiKey,
    },
    customChains: [
      {
        network: "cronos",
        chainId: 25,
        urls: {
          apiURL: "https://cronos.org/explorer/api",
          browserURL: "https://cronos.org/explorer",
        },
      },
      {
        network: "cronosTestnet",
        chainId: 338,
        urls: {
          apiURL: "https://cronos.org/explorer/testnet3/api",
          browserURL: "https://cronos.org/explorer/testnet3",
        },
      },
    ],
  },
};

export default config;
