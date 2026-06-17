// Schedule a high-risk operation through TimelockController → VaultTimelock.
//
// Supported OP values:
//   changeSigners        — SIGNERS=0xA,0xB,0xC
//   setWithdrawLimit     — TOKEN=0x... LIMIT=1000000
//   setDailyWithdrawLimit— TOKEN=0x... LIMIT=5000000
//   upgrade              — NEW_IMPL=0x...
//
// Usage:
//   TIMELOCK_ADDRESS=0x... VAULT_TIMELOCK_ADDRESS=0x... \
//   OP=changeSigners SIGNERS=0xA,0xB,0xC \
//   npx hardhat run scripts/timelock/3-schedule.js --network arbitrum

const { ethers } = require("hardhat");
require("dotenv").config();

const TIMELOCK_ADDRESS = process.env.TIMELOCK_ADDRESS;
const VAULT_TIMELOCK_ADDRESS = process.env.VAULT_TIMELOCK_ADDRESS;
const OP = process.env.OP;

function buildCalldata() {
  const iface = new ethers.Interface([
    "function changeSigners(address[] calldata newSigners)",
    "function setWithdrawLimit(address token, uint256 limit)",
    "function setDailyWithdrawLimit(address token, uint256 limit)",
    "function upgrade(address newImplementation, bytes calldata data)",
  ]);

  switch (OP) {
    case "changeSigners": {
      const signers = process.env.SIGNERS?.split(",").map((a) => a.trim());
      if (!signers || signers.length !== 3)
        throw new Error("SIGNERS must be 3 comma-separated addresses");
      return iface.encodeFunctionData("changeSigners", [signers]);
    }
    case "setWithdrawLimit": {
      const token = process.env.TOKEN;
      const limit = process.env.LIMIT;
      if (!token || !limit) throw new Error("TOKEN and LIMIT must be set");
      return iface.encodeFunctionData("setWithdrawLimit", [token, limit]);
    }
    case "setDailyWithdrawLimit": {
      const token = process.env.TOKEN;
      const limit = process.env.LIMIT;
      if (!token || !limit) throw new Error("TOKEN and LIMIT must be set");
      return iface.encodeFunctionData("setDailyWithdrawLimit", [token, limit]);
    }
    case "upgrade": {
      const newImpl = process.env.NEW_IMPL;
      if (!newImpl) throw new Error("NEW_IMPL must be set");
      return iface.encodeFunctionData("upgrade", [newImpl, "0x"]);
    }
    default:
      throw new Error(
        `Unknown OP: ${OP}. Supported: changeSigners, setWithdrawLimit, setDailyWithdrawLimit, upgrade`
      );
  }
}

async function main() {
  if (!TIMELOCK_ADDRESS || !VAULT_TIMELOCK_ADDRESS || !OP) {
    throw new Error("TIMELOCK_ADDRESS, VAULT_TIMELOCK_ADDRESS, and OP must be set");
  }

  const [proposer] = await ethers.getSigners();
  console.log("Proposer:", proposer.address);

  const timelock = await ethers.getContractAt(
    "@openzeppelin/contracts/governance/TimelockController.sol:TimelockController",
    TIMELOCK_ADDRESS
  );

  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  if (!(await timelock.hasRole(PROPOSER_ROLE, proposer.address))) {
    throw new Error("Caller does not have PROPOSER_ROLE");
  }

  const calldata = buildCalldata();
  const predecessor = ethers.ZeroHash;
  const salt = ethers.ZeroHash;
  const delay = await timelock.getMinDelay();

  console.log("Operation:", OP);
  console.log("Target:", VAULT_TIMELOCK_ADDRESS);
  console.log("Calldata:", calldata);
  console.log("Delay:", delay.toString(), "seconds");

  const tx = await timelock.schedule(
    VAULT_TIMELOCK_ADDRESS, // target is VaultTimelock, not vault directly
    0,
    calldata,
    predecessor,
    salt,
    delay
  );
  await tx.wait();

  const operationId = await timelock.hashOperation(
    VAULT_TIMELOCK_ADDRESS,
    0,
    calldata,
    predecessor,
    salt
  );
  const executableAt = Math.floor(Date.now() / 1000) + Number(delay);

  console.log("\nScheduled successfully.");
  console.log("Operation ID:", operationId);
  console.log("Executable after:", new Date(executableAt * 1000).toISOString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
