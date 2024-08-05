const { upgrades } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

const createSignature = async (
  wallet,
  to,
  amount,
  token,
  expireTime,
  requestID,
  vaultAddress,
  isEth
) => {
  let encodeString;
  let payload;

  if (isEth) {
    encodeString = [
      "ETHER",
      31337,
      to,
      amount,
      expireTime,
      requestID,
      vaultAddress,
    ];

    payload = ethers.solidityPacked(
      [
        "string",
        "uint256",
        "address",
        "uint256",
        "uint256",
        "uint256",
        "address",
      ],
      encodeString
    );
  } else {
    encodeString = [
      "ERC20",
      31337,
      to,
      amount,
      token,
      expireTime,
      requestID,
      vaultAddress,
    ];
    payload = ethers.solidityPacked(
      [
        "string",
        "uint256",
        "address",
        "uint256",
        "address",
        "uint256",
        "uint256",
        "address",
      ],
      encodeString
    );
  }

  const payloadHash = ethers.keccak256(payload);
  return wallet.signMessage(ethers.getBytes(payloadHash));
};

describe("Vault with permit", function () {
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
      ["Test Token Permit", "USDTP", 6, 1000000000],
      deployer
    );

    await token.waitForDeployment();

    console.log("Token", token.target);

    await token.connect(signer1).mint(1000000 * 10000000);
    await token.connect(signer2).mint(1000000 * 10000000);

    const vaultFactory = await ethers.getContractFactory("DEXVault");

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
    // console.log(
    //   " getImplementationAddress",
    //   await upgrades.erc1967.getImplementationAddress(proxy.target)
    // );

    // Fixtures can return anything you consider useful for your tests
    return {
      token,
      proxy,
      deployer,
      signer1,
      signer2,
      signer3,
      implementationAddress,
    };
  }

  describe("Deposit with permit", function () {
    it("Test permit approve 100 USDT in token  ", async function () {
      const { token, proxy, deployer, signer1, signer2 } =
        await loadFixture(deployFixture);

      //  await token.connect(deployer).approve(proxy.target, 1000000 * 10000000);
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
          name: "Test Token Permit",
          version: "1",
          chainId: "31337",
          verifyingContract: token.target,
        },
        primaryType: "Permit",
        message: {
          owner: deployer.address,
          spender: signer1.address,
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

      // console.log("signature", signature);

      const v = "0x" + signature.slice(130, 132);
      const r = signature.slice(0, 66);
      const s = "0x" + signature.slice(66, 130);

      await token
        .connect(signer1)
        .permit(
          deployer.address,
          signer1.address,
          1000000,
          data.message.deadline,
          v,
          r,
          s
        );

      await token
        .connect(signer1)
        .transferFrom(deployer.address, signer1.address, 1000000);

      expect(await token.balanceOf(signer1.address)).to.be.equal(
        10000001000000
      );
    });

    describe("uups upgrade ,  deposit with permit", function () {
      it(" uups upgrade", async function () {
        const {
          token,
          proxy,
          deployer,
          signer1,
          signer2,
          implementationAddress,
        } = await loadFixture(deployFixture);

        // expect(await proxy.getTokenWithdrawLimit(token.target)).to.be.reverted;

        const vault2 = await ethers.getContractFactory("DEXVaultV1");

        let proxy1 = await upgrades.upgradeProxy(proxy.target, vault2);

        expect(proxy1.target).to.equal(proxy.target);

        expect(
          await upgrades.erc1967.getImplementationAddress(proxy.target)
        ).to.not.equal(implementationAddress);

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
            name: "Test Token Permit",
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

        await proxy1
          .connect(signer1)
          .depositWithPermit(
            deployer.address,
            token.target,
            1000000,
            data.message.deadline,
            v,
            r,
            s
          );

        expect(await token.balanceOf(proxy1.target)).to.be.equal(1000000);
      });
    });

    describe("uups upgrade ,  deposit with permit, withdraw ", function () {
      it(" withdraw with dailylimit", async function () {
        const {
          token,
          proxy,
          deployer,
          signer1,
          signer2,
          implementationAddress,
        } = await loadFixture(deployFixture);

        // expect(await proxy.getTokenWithdrawLimit(token.target)).to.be.reverted;

        const vault2 = await ethers.getContractFactory("DEXVaultV1");

        let proxy1 = await upgrades.upgradeProxy(proxy.target, vault2);

        expect(proxy1.target).to.equal(proxy.target);

        expect(
          await upgrades.erc1967.getImplementationAddress(proxy.target)
        ).to.not.equal(implementationAddress);

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
            name: "Test Token Permit",
            version: "1",
            chainId: "31337",
            verifyingContract: token.target,
          },
          primaryType: "Permit",
          message: {
            owner: deployer.address,
            spender: proxy.target,
            value: 100000000,
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

        await proxy1
          .connect(signer1)
          .depositWithPermit(
            deployer.address,
            token.target,
            100000000,
            data.message.deadline,
            v,
            r,
            s
          );

        let tokenAddress = token.target;
        let vaultAddress = proxy1.target;
        expect(await token.balanceOf(proxy1.target)).to.be.equal(100000000);

        let time = Math.round(Date.now() / 1000);

        let requestID = 100;

        let sig0 = createSignature(
          deployer,
          deployer.address,
          100000000,
          tokenAddress,
          time + 3600 * 24,
          requestID,
          vaultAddress,
          0
        );
        let sig1 = createSignature(
          signer1,
          deployer.address,
          100000000,
          tokenAddress,
          time + 3600 * 24,
          requestID,
          vaultAddress,
          0
        );

        await expect(
          proxy
            .connect(deployer)
            .withdrawERC20(
              deployer.address,
              deployer.address,
              100000000,
              tokenAddress,
              time + 3600 * 24,
              requestID,
              [deployer.address, signer1.address],
              [sig0, sig1]
            )
        ).to.be.revertedWith("Daily withdrawal limit exceeded");

        await proxy1.setDailyWithdrawLimit(tokenAddress, 100000000000);

        await proxy
          .connect(deployer)
          .withdrawERC20(
            deployer.address,
            deployer.address,
            100000000,
            tokenAddress,
            time + 3600 * 24,
            requestID,
            [deployer.address, signer1.address],
            [sig0, sig1]
          );

        // console.log("events", txreceipt1.logs);

        //("args:", txreceipt.logs[1].args);
        expect(await token.balanceOf(proxy.target)).to.equal(0);
      });
    });
  });
});
