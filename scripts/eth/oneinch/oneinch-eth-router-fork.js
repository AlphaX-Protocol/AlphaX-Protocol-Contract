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
let usdtAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7";

let usdcToken = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

//V6
const oneinchrouter = "0x111111125421cA6dc452d289314280a0f8842A65";

let vault = "0xA61a6E696B7C566DA42B80dA27d96e7104bcec99";

async function main() {
  const [deployer, signer1, singer2] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // const routerFactory = await ethers.getContractFactory("DEXVaultRouter");

  // let router = await upgrades.deployProxy(
  //   routerFactory,
  //   [usdtAddress, oneinchrouter, vault],
  //   { initializer: "initialize", kind: "uups" }
  // );

  // await router.waitForDeployment();
  // console.log("Proxy contract", router.target);

  // const receipt = await router.deployTransaction;
  // console.log(
  //   " getImplementationAddress",
  //   await upgrades.erc1967.getImplementationAddress(router.target)
  // );

  let routerAddress = "0x3bbC4dBbDDdF9e3B135B3Fa928799CB4B2B53F3C";
  const router = (await ethers.getContractFactory("DEXVaultRouter")).attach(
    routerAddress
  );
  console.log("Router address:", router.target);

  // personate
  const impersonatedSigner = await ethers.getImpersonatedSigner(
    "0xf584F8728B874a6a5c7A8d4d387C9aae9172D621"
  );

  // verify contract
  // await verifyContract(router.target, network.name);

  let swapAmount = 1000000;
  const swapParams = {
    src: usdcToken, // Token address of 1INCH
    dst: usdtAddress, // Token address of DAI
    amount: swapAmount, // Amount of 1INCH to swap (in wei)
    // from: router.target,
    slippage: 1, // Maximum acceptable slippage percentage for the swap (e.g., 1 for 1%)
    disableEstimate: true, // Set to true to disable estimation of swap details
    allowPartialFill: false, // Set to true to allow partial filling of the swap order
  };

  // const swapTransaction = await buildTxForSwap(swapParams); // 0.1 USDC

  // let swapData = swapTransaction.data;
  // console.log("swapData", swapData);

  let swapData =
    "0xcc713a049b2b57401e336332e1b90cd98d3d19333c87122362467524a3bd6cb947023ead000000000000000000000000807cf9a772d5a3f9cefbc1192e939d62f0d9bd380000000000000000000000000000000000000000000000000000000000000000000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f3d9500000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000030e20066d1347200000000000000000000000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000f424020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041d63b22bf6f1fc32093f8165373f674b51dc15c3f6bb19ad3387986ed3e3f8ea27b4ae17c63ca08de2373b617fa65c6f484929323649dee81f79ce0d180b8e9e11b0000000000000000000000000000000000000000000000000000000000000060e497f8";

  const usdcPermit = await ethers.getContractAt(
    "IERC20Permit",
    usdcToken,
    deployer
  );

  let nonce1 = await usdcPermit.nonces(deployer.address);
  console.log("nonce1", nonce1);
  //  deposit

  const data = {
    types: {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    domain: {
      name: "USD Coin",
      version: "2",
      chainId: chainId,
      verifyingContract: usdcToken,
    },
    primaryType: "Permit",
    message: {
      owner: deployer.address,
      spender: router.target,
      value: swapAmount,
      nonce: nonce1, // !!!!
      deadline: Math.round(Date.now() / 1000) + 60 * 60,
    },
  };

  const signature = await deployer.signTypedData(
    data.domain,
    data.types,
    data.message
  );

  const v = "0x" + signature.slice(130, 132);
  const r = signature.slice(0, 66);
  const s = "0x" + signature.slice(66, 130);

  // await router.swapWithPermitToUSDTAndDeposit(
  //   deployer.address,
  //   usdcToken,
  //   1000000,
  //   989999,
  //   data.message.deadline,
  //   v,
  //   r,
  //   s,
  //   swapData
  // );

  const usdcERC20 = await ethers.getContractAt("IERC20", usdcToken, deployer);

  await usdcERC20.approve(router.target, swapAmount);

  await usdcERC20
    .connect(impersonatedSigner)
    .transfer(deployer.address, swapAmount);

  // console.log("bal: ", await usdcERC20.balanceOf(deployer.address));

  // console.log(
  //   "allowance: ",
  //   await usdcERC20.allowance(deployer.address, router.target)
  // );

  await router
    .connect(deployer)
    .swapToUSDTAndDeposit(
      deployer.address,
      usdcToken,
      swapAmount,
      (swapAmount * 9) / 10,
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

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
