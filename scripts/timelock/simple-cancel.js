// Cancel a pending (not yet executed) operation. Requires CANCELLER_ROLE
// (proposers get this role by default in TimelockController).
// MUST use the same OP and params that were passed to simple-schedule.js.
//
// Usage:
//   TIMELOCK_ADDRESS=0x... VAULT_ADDRESS=0x... \
//   OP=setWithdrawLimit TOKEN=0x... LIMIT=1000000 \
//   npx hardhat run scripts/timelock/simple-cancel.js --network arbitrum
//
// Alternatively, cancel directly by id:
//   TIMELOCK_ADDRESS=0x... OPERATION_ID=0x... \
//   npx hardhat run scripts/timelock/simple-cancel.js --network arbitrum

const { ethers } = require("hardhat");
const { buildCalldata } = require("./_op-builder");
require("dotenv").config();

const TIMELOCK_ADDRESS = process.env.TIMELOCK_ADDRESS;
const VAULT_ADDRESS = process.env.VAULT_ADDRESS;
const OP = process.env.OP;
const OPERATION_ID = process.env.OPERATION_ID;

async function main() {
  if (!TIMELOCK_ADDRESS) throw new Error("TIMELOCK_ADDRESS must be set");

  const [canceller] = await ethers.getSigners();
  console.log("Canceller:", canceller.address);

  const timelock = await ethers.getContractAt(
    "@openzeppelin/contracts/governance/TimelockController.sol:TimelockController",
    TIMELOCK_ADDRESS
  );

  const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
  if (!(await timelock.hasRole(CANCELLER_ROLE, canceller.address))) {
    throw new Error("Caller does not have CANCELLER_ROLE");
  }

  let operationId = OPERATION_ID;
  if (!operationId) {
    if (!VAULT_ADDRESS || !OP) {
      throw new Error(
        "Provide either OPERATION_ID, or VAULT_ADDRESS + OP (+ params) to derive it"
      );
    }
    const calldata = buildCalldata(OP, process.env);
    operationId = await timelock.hashOperation(
      VAULT_ADDRESS,
      0,
      calldata,
      ethers.ZeroHash,
      ethers.ZeroHash
    );
  }

  console.log("Operation ID:", operationId);

  if (!(await timelock.isOperationPending(operationId))) {
    throw new Error("Operation is not pending (already executed, cancelled, or never scheduled)");
  }

  const tx = await timelock.cancel(operationId);
  await tx.wait();

  console.log("Cancelled successfully.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
