// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers, network } = require("hardhat");
const fs = require("fs");

let vaultAddress = "0x640A691bB8422C6e0252C9d4b3f6f09Df217434D";
let tokenAddress = "0x0668f9B182a5977781d73cD416eF985145B9Cd80";

const createSignature = async (
  wallet,
  to,
  amount,
  token,
  expireTime,
  requestID,
  vaultAddress,
) => {
  const payload = ethers.solidityPacked(
    [
      "string",
      "uint256",
      "address",
      "uint256",
      "address",
      "uint256",
      "uint256",
      "address",
    ],
    ["ERC20", 11155111, to, amount, token, expireTime, requestID, vaultAddress],
  );
  const payloadHash = ethers.keccak256(payload);
  return wallet.signMessage(ethers.getBytes(payloadHash));
};

async function main() {
  const [deployer, signer1, singer2] = await ethers.getSigners();

  const token = (await ethers.getContractFactory("SimpleToken")).attach(
    tokenAddress,
  );

  const vault = (await ethers.getContractFactory("DEXVault")).attach(
    vaultAddress,
  );
  let time = Date.now();

  //
  //   bytes32 operationHash = keccak256(abi.encodePacked("ERC20", to, amount, token, expireTime, requestID, address(this)));
  //    operationHash = MessageHashUtils.toEthSignedMessageHash(operationHash);

  let requestID = 100;
  let sig0 = createSignature(
    deployer,
    deployer.address,
    100000000,
    tokenAddress,
    time + 3600 * 24,
    requestID,
    vaultAddress,
  );
  let sig1 = createSignature(
    signer1,
    deployer.address,
    100000000,
    tokenAddress,
    time + 3600 * 24,
    requestID,
    vaultAddress,
  );
  console.log("sig0", sig0);
  console.log("sig1", sig1);

  let result = await vault
    .connect(deployer)
    .withdrawERC20(
      deployer.address,
      100000000,
      tokenAddress,
      time + 3600 * 24,
      requestID,
      [deployer.address, signer1.address],
      [sig0, sig1],
    );

  let txreceipt = await result.wait();

  console.log("events", txreceipt.logs);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
