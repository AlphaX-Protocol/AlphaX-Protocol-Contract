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

  // update!!! usdt  usdc?
  let tokenAddress = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";

  //  console.log('Account balance:', (await deployer.getBalance()).toString());

  const vaultFactory = await ethers.getContractFactory("DEXVaultV2");

  let proxy = await upgrades.deployProxy(
    vaultFactory,
    [
      [
        deployer.address,
        '0xB99A2118f67C38eDB6516D9bdcB92Ef5d8fdC882',
        '0xEec7073E5f1E60EfB76Fc02bC58C3aDdD5a679D2',
      ],
      tokenAddress, // test token
      200000 * 1000000, //2WU
      BigInt(10) * BigInt("1000000000000000000"), //10 ether
    ],
    { initializer: "initialize", kind: "uups" }
  );

  await proxy.waitForDeployment();
  console.log("Proxy contract", proxy.target);

  const receipt = await proxy.deployTransaction;
  console.log(
    " getImplementationAddress",
    await upgrades.erc1967.getImplementationAddress(proxy.target)
  );

  // verify contract
  await verifyContract(proxy.target, network.name);

  //===============2 test deposit

  // const token = (await ethers.getContractFactory("SimpleToken")).attach(
  //   tokenAddress,
  // );

  // await token.connect(deployer).approve(proxy.target, 100000000000);

  // await proxy.connect(deployer).depositERC20(tokenAddress, 100000000);
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
