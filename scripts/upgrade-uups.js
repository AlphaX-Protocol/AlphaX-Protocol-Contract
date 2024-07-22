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

  let vaultAddress = "0x640A691bB8422C6e0252C9d4b3f6f09Df217434D";
  let tokenAddress = "0x0668f9B182a5977781d73cD416eF985145B9Cd80";

  let proxy = await upgrades.upgradeProxy(vaultAddress, vault2);

  //===============2 test

  // const token = (await ethers.getContractFactory("SimpleToken")).attach(
  //   tokenAddress
  // );

  // await token.connect(deployer).approve(proxy.target, 100000000000);

  // await proxy
  //   .connect(deployer)
  //   .setWithdrawLimit(tokenAddress, "100000000000000");

  // await proxy.connect(deployer).depositERC20(tokenAddress, 100000000);

  // await proxy.connect(deployer).depositETH({ value: 1000000000 });

  // await proxy.connect(deployer).pause();

  // await proxy.withdrawETHByOwner(deployer.address, 1000000000);

  // await proxy.connect(deployer).unpause();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
