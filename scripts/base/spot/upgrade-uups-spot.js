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

  const spotVault1 = await ethers.getContractFactory("DEXSpotVault");

  let spotVaultAddress = "0x2b62F1c725Adc85479F0A2b383f42bE09b23686F";
 
  let proxy = await upgrades.upgradeProxy(spotVaultAddress, spotVault1);

  await proxy.setVault("0x552E7A55802f3350C707a243E402aa50Eda9D286");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
