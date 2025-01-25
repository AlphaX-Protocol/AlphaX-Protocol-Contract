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


  //  console.log('Account balance:', (await deployer.getBalance()).toString());

  const Vaultv3 = await ethers.getContractFactory("DEXVaultV2");

  let vaultAddress = "0xA61a6E696B7C566DA42B80dA27d96e7104bcec99";
  let tokenAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7";
  let spotVaultAddress = "0x61c16f2864983338627c9B130D64023E12165B0f";

  // let proxy = await upgrades.upgradeProxy(vaultAddress, vault3);
   const vaultv3 = await Vaultv3.deploy();
   await vaultv3.waitForDeployment();


  
  // await proxy.setSpotVault(spotVaultAddress);






  
}

async function deployContract(name, params, deployer = undefined) {
  const contract = await hre.ethers.deployContract(name, params, deployer);
  await contract.waitForDeployment();

  contract.address = contract.target;
  return contract;
}

async function verifyContract(
  contractNameOrAddress,
  network = hre.network.name,
  constructorArguments = null
) {
  if (network == "hardhat" || network == "localhost") {
    console.log("hardhat network skip verifyContract");
    return;
  }

  let address;
  if (isAddress(contractNameOrAddress)) {
    address = contractNameOrAddress;
  } else {
    const data = fs.readFileSync(DEPLOYMENGT_DIR, "utf8");
    const addresses = JSON.parse(data);
    address = addresses[contractNameOrAddress];
  }

  if (!address) {
    console.error("verifyContract error: Contract depoloyment not found.");
    return;
  }

  let params = {
    address,
    network,
    constructorArguments: [],
  };
  if (constructorArguments) {
    params.constructorArguments = constructorArguments;
  }

  try {
    await hre.run("verify:verify", params);
    console.log("verifyContract successfully!");
  } catch (e) {
    console.error("verifyContract error:", e);
  }
}

function isAddress(str) {
  return /^0x[a-fA-F0-9]{40}$/.test(str);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
