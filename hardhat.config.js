require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("@openzeppelin/hardhat-upgrades");
require("solidity-docgen");
require("hardhat-interface-generator");
require("dotenv").config();
/** @type import('hardhat/config').HardhatUserConfig */

const settings = {
  optimizer: {
    enabled: true,
    runs: 200,
  },
};
function mnemonic() {
  return [
    process.env.PRIVATE_KEY,
    process.env.PRIVATE_KEY1,
    process.env.PRIVATE_KEY2,
  ];
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  networks: {
    localhost: {
      url: "http://localhost:8545",
    },

    hardhat: {
      forking: {
        url: "https://mainnet.infura.io/v3/" + process.env.INFURA_ID,
        blockNumber: 20638640,
      },
    },

    mainnet: {
      url: "https://mainnet.infura.io/v3/" + process.env.INFURA_ID, //<---- YOUR INFURA ID! (or it won't work)
      accounts: mnemonic(),
    },
    sepolia: {
      url: "https://sepolia.infura.io/v3/" + process.env.INFURA_ID, //<---- YOUR INFURA ID! (or it won't work)
      accounts: mnemonic(),
    },
    optimism: {
      url: "https://optimism-mainnet.infura.io/v3/" + process.env.INFURA_ID,
      accounts: mnemonic(),
    },
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: mnemonic(),
    },
    base: {
      // this is a custom network
      url: "https://mainnet.base.org/",
      accounts: mnemonic(),
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.EHTERSCAN_KEY,
      sepolia: process.env.EHTERSCAN_KEY,
      optimisticEthereum: process.env.OP_KEY,
      arbitrumOne: process.env.ARBI_KEY,
    },
  },
  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: true,
  },
};
