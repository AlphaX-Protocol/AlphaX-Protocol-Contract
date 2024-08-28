// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

const apiKey = process.env.APIKEY;
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);

const chainId = 42161; // Chain ID for Optimism

const arbiRpcUrl = "https://arbitrum.llamarpc.com";

// const provider = new ethers.providers.JsonRpcProvider(arbiRpcUrl);

const apiBaseUrl = `https://api.1inch.dev/swap/v6.0/${chainId}`;

async function main() {
  const [deployer, signer1, singer2] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // update!!!
  let usdtAddress = "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9";

  let usdcToken = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";

  //V5
  //const oneinchrouter = "0x1111111254eeb25477b68fb85ed929f73a960582";
  //V6
  const oneinchrouter = "0x111111125421cA6dc452d289314280a0f8842A65";

  let routerAddress = "0xFC1Abaf333377F3E3D51eD5e5Ff15ef477FE43fe";

  const swapParams = {
    src: usdcToken, // Token address of 1INCH
    dst: usdtAddress, // Token address of DAI
    amount: "1000000", // Amount of 1INCH to swap (in wei)
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

  // verify contract
  // await verifyContract(router.target, network.name);

  //===============2 test deposit approve

  // const token = (await ethers.getContractFactory("IERC20Permit")).attach(
  //   usdcToken
  // );

  // await token.connect(deployer).approve(router.target, 10000000);

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
      value: 1000000,
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

  await router.swapWithPermitToUSDTAndDeposit(
    deployer.address,
    usdcToken,
    1000000,
    989999,
    data.message.deadline,
    v,
    r,
    s,
    swapData
  );

  // await router.swapToUSDTAndDeposit(
  //   deployer.address,
  //   usdcToken,
  //   1000000,
  //   989999,
  //   swapData
  // );
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
