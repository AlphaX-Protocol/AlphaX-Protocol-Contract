// Simple approach: deploy a plain TimelockController and transfer the vault's
// ownership directly to it. ALL onlyOwner operations (including pause and
// emergency withdraw) will then require going through the timelock delay.
//
// Usage:
//   VAULT_ADDRESS=0x... \
//   npx hardhat run scripts/timelock/deploy-simple.js --network arbitrum
//
// Optional env vars:
//   TIMELOCK_DELAY_DAYS   min delay in days (default: 2)
//   TIMELOCK_PROPOSERS    comma-separated proposer addresses (default: deployer)
//   TIMELOCK_EXECUTORS    comma-separated executor addresses (default: address(0) = anyone)

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

  console.log("\n--- Config ---");
  console.log("Vault:", VAULT_ADDRESS);
  console.log("Min delay:", `${delayDays} days (${minDelay}s)`);
  console.log("Proposers:", proposers);
  console.log("Executors:", executors);

  // Deploy TimelockController
  console.log("\n[1/2] Deploying TimelockController...");
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

  // Transfer ownership
  console.log("\n[2/2] Transferring vault ownership to TimelockController...");
  const vault = await ethers.getContractAt("DEXVaultV1", VAULT_ADDRESS);
  const currentOwner = await vault.owner();
  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Deployer is not vault owner (owner: ${currentOwner})`);
  }
  const tx = await vault.transferOwnership(timelock.target);
  await tx.wait();
  console.log("Vault owner now:", await vault.owner());

  console.log("\n═══════════════════════════════════════════");
  console.log("  DONE");
  console.log("═══════════════════════════════════════════");
  console.log("TimelockController:", timelock.target);
  console.log("Vault:             ", VAULT_ADDRESS);
  console.log("═══════════════════════════════════════════");
  console.log("\nNext: after verification, renounce deployer admin role:");
  console.log(`  const ADMIN = await timelock.DEFAULT_ADMIN_ROLE()`);
  console.log(`  await timelock.renounceRole(ADMIN, "${deployer.address}")`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
