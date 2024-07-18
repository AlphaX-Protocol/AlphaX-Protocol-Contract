// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers, network } = require("hardhat");
const fs = require("fs");

let vaultAddress = "0x640A691bB8422C6e0252C9d4b3f6f09Df217434D";
let tokenAddress = "0x0668f9B182a5977781d73cD416eF985145B9Cd80";

async function main() {
  const [deployer, signer1, singer2] = await ethers.getSigners();

  const token = (await ethers.getContractFactory("SimpleToken")).attach(
    tokenAddress,
  );

  const vault = (await ethers.getContractFactory("DEXVault")).attach(
    vaultAddress,
  );

  await token.connect(signer1).mint(100000000000);
  await token.connect(signer1).approve(vaultAddress, 100000000000);

  await token.connect(deployer).approve(vaultAddress, 100000000);

  let result = await vault
    .connect(deployer)
    .depositERC20(tokenAddress, 100000000, deployer.address);

  let result1 = await vault
    .connect(signer1)
    .depositERC20(tokenAddress, 100000000000, signer1.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
