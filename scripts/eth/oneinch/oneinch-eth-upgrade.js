const { ethers, network, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer, signer1, singer2] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const routerV1 = await ethers.getContractFactory("DEXVaultRouter");

  let routerAddress = "0x3bbC4dBbDDdF9e3B135B3Fa928799CB4B2B53F3C";

  let proxy = await upgrades.upgradeProxy(routerAddress, routerV1);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
