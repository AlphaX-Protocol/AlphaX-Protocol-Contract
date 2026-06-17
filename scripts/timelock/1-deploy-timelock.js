// Deploy TimelockController + VaultTimelock, then transfer vault ownership.
//
// Usage:
//   VAULT_ADDRESS=0x... \
//   npx hardhat run scripts/timelock/1-deploy-timelock.js --network arbitrum
//
// Optional env vars:
//   TIMELOCK_DELAY_DAYS     min delay in days (default: 2)
//   TIMELOCK_PROPOSERS      comma-separated proposer addresses (default: deployer)
//   TIMELOCK_EXECUTORS      comma-separated executor addresses (default: address(0) = anyone)
//   EMERGENCY_ADMIN         emergency admin address (default: deployer)

const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const VAULT_ADDRESS = process.env.VAULT_ADDRESS;
  if (!VAULT_ADDRESS) throw new Error("VAULT_ADDRESS must be set");

  const delayDays = process.env.TIMELOCK_DELAY_DAYS
    ? parseInt(process.env.TIMELOCK_DELAY_DAYS)
    : 2;
  const minDelay = delayDays * 24 * 60 * 60;

  const proposers = process.env.TIMELOCK_PROPOSERS
    ? process.env.TIMELOCK_PROPOSERS.split(",").map((a) => a.trim())
    : [deployer.address];

  const executors = process.env.TIMELOCK_EXECUTORS
    ? process.env.TIMELOCK_EXECUTORS.split(",").map((a) => a.trim())
    : [ethers.ZeroAddress];

  const emergencyAdmin = process.env.EMERGENCY_ADMIN || deployer.address;

  console.log("\n--- Config ---");
  console.log("Vault:", VAULT_ADDRESS);
  console.log("Min delay:", `${delayDays} days (${minDelay}s)`);
  console.log("Proposers:", proposers);
  console.log("Executors:", executors);
  console.log("Emergency admin:", emergencyAdmin);

  // Step 1: Deploy TimelockController
  console.log("\n[1/3] Deploying TimelockController...");
  const TimelockController = await ethers.getContractFactory(
    "@openzeppelin/contracts/governance/TimelockController.sol:TimelockController"
  );
  const timelock = await TimelockController.deploy(
    minDelay,
    proposers,
    executors,
    deployer.address // admin, renounce later
  );
  await timelock.waitForDeployment();
  console.log("TimelockController:", timelock.target);

  // Step 2: Deploy VaultTimelock
  console.log("\n[2/3] Deploying VaultTimelock...");
  const VaultTimelock = await ethers.getContractFactory("VaultTimelock");
  const vaultTimelock = await VaultTimelock.deploy(
    VAULT_ADDRESS,
    emergencyAdmin,
    timelock.target
  );
  await vaultTimelock.waitForDeployment();
  console.log("VaultTimelock:", vaultTimelock.target);

  // Step 3: Transfer vault ownership
  console.log("\n[3/3] Transferring vault ownership to VaultTimelock...");
  const vault = await ethers.getContractAt("DEXVaultV1", VAULT_ADDRESS);
  const currentOwner = await vault.owner();
  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Deployer is not vault owner (owner: ${currentOwner})`);
  }
  const tx = await vault.transferOwnership(vaultTimelock.target);
  await tx.wait();
  console.log("Vault owner now:", await vault.owner());

  // Summary
  console.log("\n═══════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════");
  console.log("TimelockController:", timelock.target);
  console.log("VaultTimelock:     ", vaultTimelock.target);
  console.log("Vault:             ", VAULT_ADDRESS);
  console.log("═══════════════════════════════════════════");
  console.log("\nNext: Renounce timelock admin role after verification:");
  console.log(
    `  const ADMIN = await timelock.DEFAULT_ADMIN_ROLE()`
  );
  console.log(
    `  await timelock.renounceRole(ADMIN, "${deployer.address}")`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
