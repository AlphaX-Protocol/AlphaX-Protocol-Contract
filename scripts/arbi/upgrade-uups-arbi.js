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

  let vaultAddress = "0x552E7A55802f3350C707a243E402aa50Eda9D286";
  let tokenAddress = "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9";

  let proxy = await upgrades.upgradeProxy(vaultAddress, vault2);
  await proxy.setDailyWithdrawLimit(tokenAddress, "200000000000");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
