// Transfer vault ownership to an already-deployed VaultTimelock.
// Use this if you deployed TimelockController and VaultTimelock separately.
//
// Usage:
//   VAULT_ADDRESS=0x... VAULT_TIMELOCK_ADDRESS=0x... \
//   npx hardhat run scripts/timelock/2-transfer-ownership.js --network arbitrum

const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const VAULT_ADDRESS = process.env.VAULT_ADDRESS;
  const VAULT_TIMELOCK_ADDRESS = process.env.VAULT_TIMELOCK_ADDRESS;

  if (!VAULT_ADDRESS || !VAULT_TIMELOCK_ADDRESS) {
    throw new Error("VAULT_ADDRESS and VAULT_TIMELOCK_ADDRESS must be set");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const vault = await ethers.getContractAt("DEXVaultV1", VAULT_ADDRESS);
  const currentOwner = await vault.owner();
  console.log("Current vault owner:", currentOwner);

  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Deployer is not the vault owner (owner: ${currentOwner})`);
  }

  console.log("Transferring to VaultTimelock:", VAULT_TIMELOCK_ADDRESS);
  const tx = await vault.transferOwnership(VAULT_TIMELOCK_ADDRESS);
  await tx.wait();

  console.log("New vault owner:", await vault.owner());
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
