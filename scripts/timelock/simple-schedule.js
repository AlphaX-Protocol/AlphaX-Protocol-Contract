// Schedule an owner operation through the TimelockController (simple approach).
// The timelock targets the vault directly.
//
// Supported OP values (see _op-builder.js for required params):
//   changeSigners            SIGNERS=0xA,0xB,0xC
//   setWithdrawLimit         TOKEN=0x... LIMIT=1000000
//   setDailyWithdrawLimit    TOKEN=0x... LIMIT=5000000
//   emergencyWithdrawERC20   TOKEN=0x... TO=0x... AMOUNT=1000000
//   emergencyWithdrawETH     TO=0x... AMOUNT=1000000000000000000
//   pause / unpause          (no extra params)
//   upgrade                  NEW_IMPL=0x...
//   transferOwnership        NEW_OWNER=0x...
//
// Usage:
//   TIMELOCK_ADDRESS=0x... VAULT_ADDRESS=0x... \
//   OP=setWithdrawLimit TOKEN=0x... LIMIT=1000000 \
//   npx hardhat run scripts/timelock/simple-schedule.js --network arbitrum

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

  const calldata = buildCalldata(OP, process.env);
  const predecessor = ethers.ZeroHash;
  const salt = ethers.ZeroHash;
  const delay = await timelock.getMinDelay();

  console.log("Operation:", OP);
  console.log("Target (vault):", VAULT_ADDRESS);
  console.log("Calldata:", calldata);
  console.log("Delay:", delay.toString(), "seconds");

  const tx = await timelock.schedule(
    VAULT_ADDRESS,
    0,
    calldata,
    predecessor,
    salt,
    delay
  );
  await tx.wait();

  const operationId = await timelock.hashOperation(
    VAULT_ADDRESS,
    0,
    calldata,
    predecessor,
    salt
  );
  const executableAt = Math.floor(Date.now() / 1000) + Number(delay);

  console.log("\nScheduled successfully.");
  console.log("Operation ID:", operationId);
  console.log("Executable after:", new Date(executableAt * 1000).toISOString());
  console.log("\nExecute later with the SAME OP and params using simple-execute.js");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
