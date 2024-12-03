// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers, network } = require("hardhat");
const fs = require("fs");

let vaultAddress = "0xf9ff7215cd3e44523f2498505EdB99c345Ad67c0";
let tokenAddress = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
let spotVaultAddress = "0xB5477E33aAC80206fc0621dd51A2bE7AD7b40613";


let chainId = 8453;

const createSignature = async (
  wallet,
  owner,
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
      "address",
      "uint256",
      "address",
      "uint256",
      "uint256",
      "address",
    ],
    ["ERC20", chainId, owner, to, amount, token, expireTime, requestID, vaultAddress],
  );
  const payloadHash = ethers.keccak256(payload);
  return wallet.signMessage(ethers.getBytes(payloadHash));
};

async function main() {
  const [deployer, signer1, singer2] = await ethers.getSigners();
  // console.log("signer1", signer1.address);
  // console.log("singer2", singer2.address);

  const token = (await ethers.getContractFactory("SimpleToken")).attach(
    tokenAddress,
  );

  const vault = (await ethers.getContractFactory("DEXVaultV2")).attach(
    vaultAddress,
  );
  let time = Date.now();

  //
  //   bytes32 operationHash = keccak256(abi.encodePacked("ERC20", to, amount, token, expireTime, requestID, address(this)));
  //    operationHash = MessageHashUtils.toEthSignedMessageHash(operationHash);

  let requestID = 101;
  let sig0 = createSignature(
    deployer,
    vaultAddress,
    spotVaultAddress,
    900000,
    tokenAddress,
    time + 3600 * 24,
    requestID,
    vaultAddress,
  );
  let sig1 = createSignature(
    signer1,
    vaultAddress,
    spotVaultAddress,
    900000,
    tokenAddress,
    time + 3600 * 24,
    requestID,
    vaultAddress,
  );
  console.log("sig0", sig0);
  console.log("sig1", sig1);

  //!!! need to set spot vault!!!
 // await vault.setSpotVault(spotVaultAddress);

  // let result = await vault
  //   .connect(deployer)
  //   .withdrawERC20FromSpot(
  //     deployer.address,
  //     deployer.address,
  //     900000,
  //     tokenAddress,
  //     time + 3600 * 24,
  //     requestID,
  //     [deployer.address, signer1.address],
  //     [sig0, sig1],
  //   );

  // let txreceipt = await result.wait();

  // console.log("events", txreceipt.logs);

  // test WithdrawUsdtAndDepositToSpotVault

  let result = await vault.WithdrawUsdtAndDepositToSpotVault(
    tokenAddress,
    900000,
    time + 3600 * 24,
    requestID,
    [deployer.address, signer1.address],
    [sig0, sig1],
  );  



  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
