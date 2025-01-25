// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const fs = require("fs");
const { randomInt } = require("crypto");
require("dotenv").config();

const apiKey = process.env.APIKEY;

const chainId = 8453; // Chain ID for Optimism

const apiBaseUrl = `https://api.1inch.dev/swap/v6.0/${chainId}`;

async function main() {
  const [deployer, signer1, singer2] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // update!!!
  let usdtToken = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
  let usdcToken = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

  //V6
  const oneinchrouter = "0x111111125421cA6dc452d289314280a0f8842A65";

  let spotVaultAddress = "0xB5477E33aAC80206fc0621dd51A2bE7AD7b40613";

  let swapAmount = 1000000;

  const swapParams = {
    src: usdtToken, // 
    dst: usdcToken, // 
    amount: swapAmount, // Amount of 1INCH to swap (in wei)
    from: spotVaultAddress,
    slippage: 1, // Maximum acceptable slippage percentage for the swap (e.g., 1 for 1%)
    disableEstimate: true, // Set to true to disable estimation of swap details
    allowPartialFill: false, // Set to true to allow partial filling of the swap order
  };

  const swapTransaction = await buildTxForSwap(swapParams); // 0.1 USDC

  let swapData = swapTransaction.data;
  console.log("swapData", swapData);

  const spotVault = (await ethers.getContractFactory("DEXSpotVault")).attach(
    spotVaultAddress
  );

  //===============2 test deposit approve

   const usdcERC20 = await ethers.getContractAt("IERC20", usdtToken, deployer);
  await usdcERC20.transfer(spotVaultAddress, swapAmount);

  
  let tx = await spotVault.spotSwap(
    deployer.address,
    1,
    usdtToken,
    1000000,
    usdcToken,
    989999,
    swapData
  );
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

  console.log("data", data);
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
  //  console.log("broadCast", data);
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
