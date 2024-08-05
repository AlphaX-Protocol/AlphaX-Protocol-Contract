// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers, network, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer, signer1, singer2] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const vault2 = await ethers.getContractFactory("DEXVaultV1");

  let vaultAddress = "0xA61a6E696B7C566DA42B80dA27d96e7104bcec99";
  let tokenAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7";

  let proxy = await upgrades.upgradeProxy(vaultAddress, vault2);

  //await proxy.setDailyWithdrawLimit(tokenAddress, "200000000000");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
