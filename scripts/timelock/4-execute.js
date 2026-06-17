// Execute a scheduled operation after the timelock delay has passed.
// Parameters must match exactly what was passed to 3-schedule.js.
//
// Usage:
//   TIMELOCK_ADDRESS=0x... VAULT_TIMELOCK_ADDRESS=0x... \
//   OP=changeSigners SIGNERS=0xA,0xB,0xC \
//   npx hardhat run scripts/timelock/4-execute.js --network arbitrum

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

  const [executor] = await ethers.getSigners();
  console.log("Executor:", executor.address);

  const timelock = await ethers.getContractAt(
    "@openzeppelin/contracts/governance/TimelockController.sol:TimelockController",
    TIMELOCK_ADDRESS
  );

  const calldata = buildCalldata();
  const predecessor = ethers.ZeroHash;
  const salt = ethers.ZeroHash;

  const operationId = await timelock.hashOperation(
    VAULT_TIMELOCK_ADDRESS,
    0,
    calldata,
    predecessor,
    salt
  );

  console.log("Operation ID:", operationId);

  const isReady = await timelock.isOperationReady(operationId);
  const isDone = await timelock.isOperationDone(operationId);
  const isPending = await timelock.isOperationPending(operationId);

  if (isDone) throw new Error("Operation already executed");
  if (!isPending) throw new Error("Operation not scheduled — run 3-schedule.js first");
  if (!isReady) {
    const timestamp = await timelock.getTimestamp(operationId);
    throw new Error(
      `Timelock not expired. Executable after: ${new Date(Number(timestamp) * 1000).toISOString()}`
    );
  }

  console.log("Executing:", OP);
  const tx = await timelock.execute(
    VAULT_TIMELOCK_ADDRESS,
    0,
    calldata,
    predecessor,
    salt
  );
  await tx.wait();

  console.log("Executed successfully.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
