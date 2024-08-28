const { upgrades } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Router Swap and Deposit", function () {
  const ETH = BigInt("1000000000000000000");
  const provider = ethers.provider;

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFixture() {
    // Get the Signers here.
    const [deployer, signer1, signer2, signer3] = await ethers.getSigners();

    console.log("deployer", deployer.address);
    const token = await ethers.deployContract(
      "SimpleTokenWithPermit",
      ["USDC Token Permit", "USDC", 6, 1000000000],
      deployer
    );

    await token.waitForDeployment();

    console.log("Token", token.target);

    await token.connect(signer1).mint(1000000 * 10000000);
    await token.connect(signer2).mint(1000000 * 10000000);

    const vaultFactory = await ethers.getContractFactory("DEXVaultV1");

    let proxy = await upgrades.deployProxy(
      vaultFactory,
      [
        [deployer.address, signer1.address, signer2.address],
        token.target,
        200000 * 1000000, //20000 USDT
        BigInt(10) * BigInt("1000000000000000000"), //10 ether
      ],
      { initializer: "initialize", kind: "uups" }
    );

    await proxy.waitForDeployment();
    console.log("Proxy", proxy.target);

    const receipt = await proxy.deployTransaction;
    let implementationAddress = await upgrades.erc1967.getImplementationAddress(
      proxy.target
    );

    let oneinchrouter = "0x1cC3f7a55C42f6955C3f3768aCa66BA8EdFBb6a7";
    const routerFactory = await ethers.getContractFactory("DEXVaultRouter");

    let router = await upgrades.deployProxy(
      routerFactory,
      [token.target, oneinchrouter, proxy.target],
      { initializer: "initialize", kind: "uups" }
    );

    // console.log(
    //   " getImplementationAddress",
    //   await upgrades.erc1967.getImplementationAddress(proxy.target)
    // );

    // Fixtures can return anything you consider useful for your tests
    return {
      token,
      proxy,
      router,
      deployer,
      signer1,
      signer2,
      signer3,
      implementationAddress,
    };
  }

  describe("Deposit with permit", function () {
    describe("router,  deposit with permit", function () {
      it(" router , approve ", async function () {
        const {
          token,
          proxy,
          router,
          deployer,
          signer1,
          signer2,
          implementationAddress,
        } = await loadFixture(deployFixture);

        // expect(await proxy.getTokenWithdrawLimit(token.target)).to.be.reverted;

        const data = {
          types: {
            Permit: [
              { name: "owner", type: "address" },
              { name: "spender", type: "address" },
              { name: "value", type: "uint256" },
              { name: "nonce", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          },
          domain: {
            name: "USDC Token Permit",
            version: "1",
            chainId: "31337",
            verifyingContract: token.target,
          },
          primaryType: "Permit",
          message: {
            owner: deployer.address,
            spender: proxy.target,
            value: 1000000,
            nonce: 0,
            deadline: Math.round(Date.now() / 1000) + 1000 * 60 * 60,
          },
        };

        const signature = await deployer.signTypedData(
          data.domain,
          data.types,
          data.message
        );

        const v = "0x" + signature.slice(130, 132);
        const r = signature.slice(0, 66);
        const s = "0x" + signature.slice(66, 130);

        await token.approve(router.target, 1000000);

        await router.swapToUSDTAndDeposit(
          deployer.address,
          token.target,
          1000000,
          0,
          "0x00"
        );
      });
      it(" router , permit ", async function () {
        const {
          token,
          proxy,
          router,
          deployer,
          signer1,
          signer2,
          implementationAddress,
        } = await loadFixture(deployFixture);

        // expect(await proxy.getTokenWithdrawLimit(token.target)).to.be.reverted;

        const data = {
          types: {
            Permit: [
              { name: "owner", type: "address" },
              { name: "spender", type: "address" },
              { name: "value", type: "uint256" },
              { name: "nonce", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          },
          domain: {
            name: "USDC Token Permit",
            version: "1",
            chainId: "31337",
            verifyingContract: token.target,
          },
          primaryType: "Permit",
          message: {
            owner: deployer.address,
            spender: router.target,
            value: 1000000,
            nonce: 0,
            deadline: Math.round(Date.now() / 1000) + 1000 * 60 * 60,
          },
        };

        const signature = await deployer.signTypedData(
          data.domain,
          data.types,
          data.message
        );

        const v = "0x" + signature.slice(130, 132);
        const r = signature.slice(0, 66);
        const s = "0x" + signature.slice(66, 130);

        await token.approve(router.target, 1000000);

        await router.swapWithPermitToUSDTAndDeposit(
          deployer.address,
          token.target,
          1000000,
          0,
          data.message.deadline,
          v,
          r,
          s,
          "0x00"
        );
      });
    });
  });
});
