const { upgrades } = require("hardhat");
const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("TimelockController as vault owner (simple approach)", function () {
  const MIN_DELAY = 2 * 24 * 60 * 60; // 2 days
  const ZERO_HASH = ethers.ZeroHash;

  async function deployFixture() {
    const [deployer, signer1, signer2, signer3, proposer, executor] =
      await ethers.getSigners();

    // Deploy test token
    const token = await ethers.deployContract(
      "SimpleToken",
      ["Test Token", "USDTM", 6, 1000000000],
      deployer
    );
    await token.waitForDeployment();

    // Deploy DEXVaultV1 proxy
    const vaultFactory = await ethers.getContractFactory("DEXVaultV1");
    const proxy = await upgrades.deployProxy(
      vaultFactory,
      [
        [deployer.address, signer1.address, signer2.address],
        token.target,
        200000 * 1000000,
        BigInt(10) * BigInt("1000000000000000000"),
      ],
      { initializer: "initialize", kind: "uups" }
    );
    await proxy.waitForDeployment();

    // Deploy TimelockController
    const TimelockController = await ethers.getContractFactory(
      "@openzeppelin/contracts/governance/TimelockController.sol:TimelockController"
    );
    const timelock = await TimelockController.deploy(
      MIN_DELAY,
      [proposer.address], // proposers
      [executor.address], // executors
      deployer.address // admin
    );
    await timelock.waitForDeployment();

    // Transfer vault ownership to the timelock
    await proxy.connect(deployer).transferOwnership(timelock.target);

    return {
      token,
      proxy,
      timelock,
      deployer,
      signer1,
      signer2,
      signer3,
      proposer,
      executor,
    };
  }

  describe("Setup", function () {
    it("timelock is the vault owner after transfer", async function () {
      const { proxy, timelock } = await loadFixture(deployFixture);
      expect(await proxy.owner()).to.equal(timelock.target);
    });

    it("min delay is configured correctly", async function () {
      const { timelock } = await loadFixture(deployFixture);
      expect(await timelock.getMinDelay()).to.equal(MIN_DELAY);
    });
  });

  describe("Direct owner calls are blocked", function () {
    it("deployer can no longer call setWithdrawLimit directly", async function () {
      const { proxy, token, deployer } = await loadFixture(deployFixture);
      await expect(
        proxy.connect(deployer).setWithdrawLimit(token.target, 123456)
      ).to.be.revertedWithCustomError(proxy, "OwnableUnauthorizedAccount");
    });

    it("deployer can no longer call changeSigners directly", async function () {
      const { proxy, deployer, signer1, signer2, signer3 } =
        await loadFixture(deployFixture);
      await expect(
        proxy
          .connect(deployer)
          .changeSigners([signer1.address, signer2.address, signer3.address])
      ).to.be.revertedWithCustomError(proxy, "OwnableUnauthorizedAccount");
    });

    it("deployer can no longer call pause directly", async function () {
      const { proxy, deployer } = await loadFixture(deployFixture);
      await expect(
        proxy.connect(deployer).pause()
      ).to.be.revertedWithCustomError(proxy, "OwnableUnauthorizedAccount");
    });
  });

  describe("Operations via timelock", function () {
    it("full flow: schedule -> wait -> execute setWithdrawLimit", async function () {
      const { proxy, token, timelock, proposer, executor } =
        await loadFixture(deployFixture);

      const newLimit = 999999n * 1000000n;
      const calldata = proxy.interface.encodeFunctionData("setWithdrawLimit", [
        token.target,
        newLimit,
      ]);

      // Schedule by proposer
      await timelock
        .connect(proposer)
        .schedule(proxy.target, 0, calldata, ZERO_HASH, ZERO_HASH, MIN_DELAY);

      const opId = await timelock.hashOperation(
        proxy.target,
        0,
        calldata,
        ZERO_HASH,
        ZERO_HASH
      );
      expect(await timelock.isOperationPending(opId)).to.equal(true);
      expect(await timelock.isOperationReady(opId)).to.equal(false);

      // Fast-forward past the delay
      await time.increase(MIN_DELAY + 1);
      expect(await timelock.isOperationReady(opId)).to.equal(true);

      // Execute by executor
      await timelock
        .connect(executor)
        .execute(proxy.target, 0, calldata, ZERO_HASH, ZERO_HASH);

      expect(await timelock.isOperationDone(opId)).to.equal(true);
      expect(await proxy.getTokenWithdrawLimit(token.target)).to.equal(newLimit);
    });

    it("execute before delay reverts", async function () {
      const { proxy, token, timelock, proposer, executor } =
        await loadFixture(deployFixture);

      const calldata = proxy.interface.encodeFunctionData("setWithdrawLimit", [
        token.target,
        123n,
      ]);

      await timelock
        .connect(proposer)
        .schedule(proxy.target, 0, calldata, ZERO_HASH, ZERO_HASH, MIN_DELAY);

      // Try to execute immediately (no time increase)
      await expect(
        timelock
          .connect(executor)
          .execute(proxy.target, 0, calldata, ZERO_HASH, ZERO_HASH)
      ).to.be.revertedWithCustomError(timelock, "TimelockUnexpectedOperationState");
    });

    it("changeSigners via timelock updates signers", async function () {
      const { proxy, timelock, proposer, executor, signer1, signer2, signer3 } =
        await loadFixture(deployFixture);

      const newSigners = [signer1.address, signer2.address, signer3.address];
      const calldata = proxy.interface.encodeFunctionData("changeSigners", [
        newSigners,
      ]);

      await timelock
        .connect(proposer)
        .schedule(proxy.target, 0, calldata, ZERO_HASH, ZERO_HASH, MIN_DELAY);

      await time.increase(MIN_DELAY + 1);

      await timelock
        .connect(executor)
        .execute(proxy.target, 0, calldata, ZERO_HASH, ZERO_HASH);

      expect(await proxy.getSigners()).to.deep.equal(newSigners);
    });

    it("upgrade via timelock replaces implementation", async function () {
      const { proxy, timelock, proposer, executor } =
        await loadFixture(deployFixture);

      const oldImpl = await upgrades.erc1967.getImplementationAddress(
        proxy.target
      );

      // Deploy a new implementation (reuse DEXVaultV1 as a fresh impl)
      const NewImpl = await ethers.getContractFactory("DEXVaultV1");
      const newImpl = await NewImpl.deploy();
      await newImpl.waitForDeployment();

      const calldata = proxy.interface.encodeFunctionData("upgradeToAndCall", [
        newImpl.target,
        "0x",
      ]);

      await timelock
        .connect(proposer)
        .schedule(proxy.target, 0, calldata, ZERO_HASH, ZERO_HASH, MIN_DELAY);

      await time.increase(MIN_DELAY + 1);

      await timelock
        .connect(executor)
        .execute(proxy.target, 0, calldata, ZERO_HASH, ZERO_HASH);

      const updatedImpl = await upgrades.erc1967.getImplementationAddress(
        proxy.target
      );
      expect(updatedImpl).to.equal(newImpl.target);
      expect(updatedImpl).to.not.equal(oldImpl);
    });
  });

  describe("Access control", function () {
    it("non-proposer cannot schedule", async function () {
      const { proxy, token, timelock, deployer } =
        await loadFixture(deployFixture);

      const calldata = proxy.interface.encodeFunctionData("setWithdrawLimit", [
        token.target,
        1n,
      ]);

      await expect(
        timelock
          .connect(deployer)
          .schedule(proxy.target, 0, calldata, ZERO_HASH, ZERO_HASH, MIN_DELAY)
      ).to.be.revertedWithCustomError(
        timelock,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("non-executor cannot execute", async function () {
      const { proxy, token, timelock, proposer, deployer } =
        await loadFixture(deployFixture);

      const calldata = proxy.interface.encodeFunctionData("setWithdrawLimit", [
        token.target,
        1n,
      ]);

      await timelock
        .connect(proposer)
        .schedule(proxy.target, 0, calldata, ZERO_HASH, ZERO_HASH, MIN_DELAY);
      await time.increase(MIN_DELAY + 1);

      await expect(
        timelock
          .connect(deployer)
          .execute(proxy.target, 0, calldata, ZERO_HASH, ZERO_HASH)
      ).to.be.revertedWithCustomError(
        timelock,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("proposer can cancel a pending operation", async function () {
      const { proxy, token, timelock, proposer } =
        await loadFixture(deployFixture);

      const calldata = proxy.interface.encodeFunctionData("setWithdrawLimit", [
        token.target,
        1n,
      ]);

      await timelock
        .connect(proposer)
        .schedule(proxy.target, 0, calldata, ZERO_HASH, ZERO_HASH, MIN_DELAY);

      const opId = await timelock.hashOperation(
        proxy.target,
        0,
        calldata,
        ZERO_HASH,
        ZERO_HASH
      );

      await timelock.connect(proposer).cancel(opId);
      expect(await timelock.isOperation(opId)).to.equal(false);
    });
  });
});
