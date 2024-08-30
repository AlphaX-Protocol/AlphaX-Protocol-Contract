// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

const apiKey = process.env.APIKEY;
const chainId = 1; // Chain ID
const apiBaseUrl = `https://api.1inch.dev/swap/v6.0/${chainId}`;

// update!!!
let usdtAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7";

let usdcToken = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

//V6
const oneinchrouter = "0x111111125421cA6dc452d289314280a0f8842A65";

let vault = "0xA61a6E696B7C566DA42B80dA27d96e7104bcec99";

async function main() {
  const [deployer, signer1, singer2] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const routerFactory = await ethers.getContractFactory("DEXVaultRouter");

  let proxy = await upgrades.deployProxy(
    routerFactory,
    [usdtAddress, oneinchrouter, vault],
    { initializer: "initialize", kind: "uups" }
  );

  await proxy.waitForDeployment();
  console.log("Proxy contract", proxy.target);

  const receipt = await proxy.deployTransaction;
  console.log(
    " getImplementationAddress",
    await upgrades.erc1967.getImplementationAddress(proxy.target)
  );

  console.log("Router address:", proxy.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
