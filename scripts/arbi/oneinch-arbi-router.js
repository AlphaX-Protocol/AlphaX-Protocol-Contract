// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

const apiKey = process.env.APIKEY;
const chainId = 42161; // Chain ID
const arbiRpcUrl = "https://arbitrum.llamarpc.com";
const apiBaseUrl = `https://api.1inch.dev/swap/v5.2/${chainId}`;

// update!!!
let usdtAddress = "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9";

let usdcToken = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";

//V5
//const oneinchrouter = "0x1111111254eeb25477b68fb85ed929f73a960582";
//V6
const oneinchrouter = "0x111111125421cA6dc452d289314280a0f8842A65";

//let vault = "0x552E7A55802f3350C707a243E402aa50Eda9D286";
let vault = "0xf9ff7215cd3e44523f2498505edb99c345ad67c0";

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

  // verify contract
  // await verifyContract(router.target, network.name);
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

async function buildTxForSwap(swapParams) {
  const url = apiRequestUrl("/swap", swapParams);
  console.log(url);
  const headers = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  };
  // Fetch the swap transaction details from the API
  const response = await fetch(url, headers);

  const data = await response.json();

  // console.log("data", data);
  return data.tx;
}

function apiRequestUrl(methodName, queryParams) {
  let s =
    apiBaseUrl + methodName + "?" + new URLSearchParams(queryParams).toString();

  return s;
}

function isAddress(str) {
  return /^0x[a-fA-F0-9]{40}$/.test(str);
}

async function broadCastRawTransaction(rawTransaction) {
  const response = await fetch(broadcastApiUrl, {
    method: "post",
    body: JSON.stringify({ rawTransaction }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await response.json();
  console.log("broadCast", data);
  return data.transactionHash;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
