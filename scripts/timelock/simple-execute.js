// Execute a scheduled owner operation after the timelock delay has passed.
// MUST use the same OP and params that were passed to simple-schedule.js.
//
// Usage:
//   TIMELOCK_ADDRESS=0x... VAULT_ADDRESS=0x... \
//   OP=setWithdrawLimit TOKEN=0x... LIMIT=1000000 \
//   npx hardhat run scripts/timelock/simple-execute.js --network arbitrum

const { ethers } = require("hardhat");
const { buildCalldata } = require("./_op-builder");
require("dotenv").config();

const TIMELOCK_ADDRESS = process.env.TIMELOCK_ADDRESS;
const VAULT_ADDRESS = process.env.VAULT_ADDRESS;
const OP = process.env.OP;

async function main() {
  if (!TIMELOCK_ADDRESS || !VAULT_ADDRESS || !OP) {
    throw new Error("TIMELOCK_ADDRESS, VAULT_ADDRESS, and OP must be set");
  }

  const [executor] = await ethers.getSigners();
  console.log("Executor:", executor.address);

  const timelock = await ethers.getContractAt(
    "@openzeppelin/contracts/governance/TimelockController.sol:TimelockController",
    TIMELOCK_ADDRESS
  );

  const calldata = buildCalldata(OP, process.env);
  const predecessor = ethers.ZeroHash;
  const salt = ethers.ZeroHash;

  const operationId = await timelock.hashOperation(
    VAULT_ADDRESS,
    0,
    calldata,
    predecessor,
    salt
  );
  console.log("Operation ID:", operationId);

  const isDone = await timelock.isOperationDone(operationId);
  const isPending = await timelock.isOperationPending(operationId);
  const isReady = await timelock.isOperationReady(operationId);

  if (isDone) throw new Error("Operation already executed");
  if (!isPending) throw new Error("Operation not scheduled — run simple-schedule.js first");
  if (!isReady) {
    const timestamp = await timelock.getTimestamp(operationId);
    throw new Error(
      `Timelock not expired. Executable after: ${new Date(
        Number(timestamp) * 1000
      ).toISOString()}`
    );
  }

  console.log("Executing:", OP);
  const tx = await timelock.execute(
    VAULT_ADDRESS,
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
