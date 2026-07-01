// Shared operation builder for the simple timelock approach.
// The timelock targets the vault directly, so calldata uses the vault's own ABI.
// Both simple-schedule.js and simple-execute.js import this to guarantee the
// scheduled and executed calldata are identical.

const { ethers } = require("hardhat");

// Vault ABI fragments for the owner-only operations that go through the timelock.
const VAULT_IFACE = new ethers.Interface([
  "function changeSigners(address[] allowedSigners)",
  "function setWithdrawLimit(address token, uint256 withdrawLimit)",
  "function setDailyWithdrawLimit(address token, uint256 dailyWithdrawLimit)",
  "function withdrawERC20TokenByOwner(address token, address to, uint256 amount)",
  "function withdrawETHByOwner(address to, uint256 amount)",
  "function pause()",
  "function unpause()",
  "function upgradeToAndCall(address newImplementation, bytes data)",
  "function transferOwnership(address newOwner)",
]);

// Build calldata for the given OP from environment variables.
function buildCalldata(op, env) {
  switch (op) {
    case "changeSigners": {
      const signers = env.SIGNERS?.split(",").map((a) => a.trim());
      if (!signers || signers.length !== 3)
        throw new Error("SIGNERS must be 3 comma-separated addresses");
      return VAULT_IFACE.encodeFunctionData("changeSigners", [signers]);
    }
    case "setWithdrawLimit": {
      if (!env.TOKEN || !env.LIMIT) throw new Error("TOKEN and LIMIT must be set");
      return VAULT_IFACE.encodeFunctionData("setWithdrawLimit", [env.TOKEN, env.LIMIT]);
    }
    case "setDailyWithdrawLimit": {
      if (!env.TOKEN || !env.LIMIT) throw new Error("TOKEN and LIMIT must be set");
      return VAULT_IFACE.encodeFunctionData("setDailyWithdrawLimit", [env.TOKEN, env.LIMIT]);
    }
    case "emergencyWithdrawERC20": {
      if (!env.TOKEN || !env.TO || !env.AMOUNT)
        throw new Error("TOKEN, TO and AMOUNT must be set");
      return VAULT_IFACE.encodeFunctionData("withdrawERC20TokenByOwner", [
        env.TOKEN,
        env.TO,
        env.AMOUNT,
      ]);
    }
    case "emergencyWithdrawETH": {
      if (!env.TO || !env.AMOUNT) throw new Error("TO and AMOUNT must be set");
      return VAULT_IFACE.encodeFunctionData("withdrawETHByOwner", [env.TO, env.AMOUNT]);
    }
    case "pause":
      return VAULT_IFACE.encodeFunctionData("pause", []);
    case "unpause":
      return VAULT_IFACE.encodeFunctionData("unpause", []);
    case "upgrade": {
      if (!env.NEW_IMPL) throw new Error("NEW_IMPL must be set");
      return VAULT_IFACE.encodeFunctionData("upgradeToAndCall", [env.NEW_IMPL, "0x"]);
    }
    case "transferOwnership": {
      if (!env.NEW_OWNER) throw new Error("NEW_OWNER must be set");
      return VAULT_IFACE.encodeFunctionData("transferOwnership", [env.NEW_OWNER]);
    }
    default:
      throw new Error(
        `Unknown OP: ${op}. Supported: changeSigners, setWithdrawLimit, ` +
          `setDailyWithdrawLimit, emergencyWithdrawERC20, emergencyWithdrawETH, ` +
          `pause, unpause, upgrade, transferOwnership`
      );
  }
}

module.exports = { buildCalldata, VAULT_IFACE };
