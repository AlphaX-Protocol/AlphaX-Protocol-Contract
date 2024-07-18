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

  const vault2 = await ethers.getContractFactory("DEXVaultMock");

  let vaultAddress = "0x2C9d056e37208F732B74A23E72c577f21a9cE710";
  let tokenAddress = "0xE9e4e7ee5187f8B6EDeB96c31De32A8594A97A53";

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
