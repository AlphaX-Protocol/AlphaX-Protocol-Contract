// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

const apiKey = process.env.APIKEY;

const chainId = 42161; // Chain ID for Optimism

const apiBaseUrl = `https://api.1inch.dev/swap/v6.0/${chainId}`;

async function main() {
  const [deployer, signer1, singer2] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // update!!!
  let usdtToken = "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9";
  let usdcToken = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";

  //V6
  const oneinchrouter = "0x111111125421cA6dc452d289314280a0f8842A65";

  let routerAddress = "0xFC1Abaf333377F3E3D51eD5e5Ff15ef477FE43fe";

  let swapAmount = 1000000;

  const swapParams = {
    src: usdcToken, // Token address of 1INCH
    dst: usdtToken, // Token address of DAI
    amount: swapAmount, // Amount of 1INCH to swap (in wei)
    from: routerAddress,
    slippage: 1, // Maximum acceptable slippage percentage for the swap (e.g., 1 for 1%)
    disableEstimate: true, // Set to true to disable estimation of swap details
    allowPartialFill: false, // Set to true to allow partial filling of the swap order
  };

  const swapTransaction = await buildTxForSwap(swapParams); // 0.1 USDC

  let swapData = swapTransaction.data;
  console.log("swapData", swapData);

  const router = (await ethers.getContractFactory("DEXVaultRouter")).attach(
    routerAddress
  );

  console.log("Router address:", router.target);

  //===============2 test deposit approve

  const usdcERC20 = await ethers.getContractAt("IERC20", usdcToken, deployer);
  await usdcERC20.approve(router.target, swapAmount);

  //no permit version
  await router.swapToUSDTAndDeposit(
    deployer.address,
    usdcToken,
    swapAmount,
    (swapAmount * 9) / 10, // fix this
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

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
