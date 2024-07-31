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

describe("Vault", function () {
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
      "SimpleToken",
      ["Test Token", "USDTM", 6, 1000000000],
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

  describe("Deposit", function () {
    it("Test deposit 100  USDT and check event", async function () {
      const { token, proxy, deployer, signer1, signer2 } =
        await loadFixture(deployFixture);

      await token.connect(deployer).approve(proxy.target, 1000000 * 10000000);

      let result = await proxy
        .connect(deployer)
        .depositERC20(token.target, 100 * 1000000, deployer.address);

      let txreceipt = await result.wait();

      // console.log("logs--", txreceipt.logs);

      expect(txreceipt.logs[1].topics[0]).to.equal(
        "0x7cfff908a4b583f36430b25d75964c458d8ede8a99bd61be750e97ee1b2f3a96"
      );
      expect(txreceipt.logs[1].topics[1]).to.equal(
        "0x000000000000000000000000" + deployer.address.slice(2).toLowerCase()
      );
      expect(txreceipt.logs[1].topics[2]).to.equal(
        "0x000000000000000000000000" + deployer.address.slice(2).toLowerCase()
      );
      expect(txreceipt.logs[1].topics[3]).to.equal(
        "0x000000000000000000000000" + token.target.slice(2).toLowerCase()
      );
      expect(txreceipt.logs[1].data).to.equal(100000000n);
    });

    it("Test deposit 1  ETH and check event", async function () {
      const { token, proxy, deployer, signer1, signer2 } =
        await loadFixture(deployFixture);

      expect(await provider.getBalance(proxy.target)).to.equal(0);

      let result = await proxy
        .connect(deployer)
        .depositETH(deployer.address, { value: ETH });

      expect(await provider.getBalance(proxy.target)).to.equal(ETH);

      let txreceipt = await result.wait();

      // ("events", txreceipt.logs);
      expect(txreceipt.logs[0].topics[0]).to.equal(
        "0x7cfff908a4b583f36430b25d75964c458d8ede8a99bd61be750e97ee1b2f3a96"
      );
      expect(txreceipt.logs[0].topics[1]).to.equal(
        "0x000000000000000000000000" + deployer.address.slice(2).toLowerCase()
      );
      expect(txreceipt.logs[0].topics[2]).to.equal(
        "0x000000000000000000000000" + deployer.address.slice(2).toLowerCase()
      );
      expect(txreceipt.logs[0].topics[3]).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(txreceipt.logs[0].data).to.equal(1000000000000000000n);
    });

    it("Test send 1  ETH and check event", async function () {
      const { token, proxy, deployer, signer1, signer2 } =
        await loadFixture(deployFixture);

      expect(await provider.getBalance(proxy.target)).to.equal(0);

      const tx = await signer1.sendTransaction({
        to: proxy.target,
        value: ethers.parseUnits("1", "ether"),
      });

      expect(await provider.getBalance(proxy.target)).to.equal(ETH);

      let txreceipt = await tx.wait();

      // ("events", txreceipt.logs);
      expect(txreceipt.logs[0].topics[0]).to.equal(
        "0x7cfff908a4b583f36430b25d75964c458d8ede8a99bd61be750e97ee1b2f3a96"
      );
      expect(txreceipt.logs[0].topics[1]).to.equal(
        "0x000000000000000000000000" + signer1.address.slice(2).toLowerCase()
      );
      expect(txreceipt.logs[0].topics[2]).to.equal(
        "0x000000000000000000000000" + signer1.address.slice(2).toLowerCase()
      );
      expect(txreceipt.logs[0].topics[3]).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(txreceipt.logs[0].data).to.equal(1000000000000000000n);
    });
  });

  describe("Withdrawals", function () {
    it("Test deposit 100  USDT and  withdraw 100 USDT, expire ", async function () {
      const { lock } = await loadFixture(deployFixture);

      const { token, proxy, deployer, signer1, signer2 } =
        await loadFixture(deployFixture);

      let tokenAddress = token.target;
      let vaultAddress = proxy.target;

      await token.connect(deployer).approve(proxy.target, 1000000 * 10000000);

      let result = await proxy
        .connect(deployer)
        .depositERC20(token.target, 100 * 1000000, deployer.address);

      let txreceipt = await result.wait();

      expect(await token.balanceOf(proxy.target)).to.equal(100 * 1000000);

      let time = Math.round(Date.now() / 1000);

      let requestID = 100;

      let sig0 = createSignature(
        deployer,
        deployer.address,
        100000000,
        tokenAddress,
        time,
        requestID,
        vaultAddress,
        0
      );
      let sig1 = createSignature(
        signer1,
        deployer.address,
        100000000,
        tokenAddress,
        time,
        requestID,
        vaultAddress,
        0
      );

      await expect(
        proxy
          .connect(deployer)
          .withdrawERC20(
            deployer.address,
            100000000,
            tokenAddress,
            time,
            requestID,
            [deployer.address, signer1.address],
            [sig0, sig1]
          )
      ).to.be.revertedWith("expired transaction");
    });
    it("Test deposit 100  USDT and  withdraw 100 USDT", async function () {
      const { lock } = await loadFixture(deployFixture);

      const { token, proxy, deployer, signer1, signer2 } =
        await loadFixture(deployFixture);

      let tokenAddress = token.target;
      let vaultAddress = proxy.target;

      await token.connect(deployer).approve(proxy.target, 1000000 * 10000000);

      let result = await proxy
        .connect(deployer)
        .depositERC20(token.target, 100 * 1000000, deployer.address);

      let txreceipt = await result.wait();

      expect(await token.balanceOf(proxy.target)).to.equal(100 * 1000000);

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

      let result1 = await proxy
        .connect(deployer)
        .withdrawERC20(
          deployer.address,
          100000000,
          tokenAddress,
          time + 3600 * 24,
          requestID,
          [deployer.address, signer1.address],
          [sig0, sig1]
        );

      let txreceipt1 = await result1.wait();

      //("events", txreceipt1.logs);

      expect(txreceipt1.logs[1].topics[0]).to.equal(
        "0xfbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db"
      );
      expect(txreceipt1.logs[1].topics[1]).to.equal(
        "0x000000000000000000000000" + deployer.address.slice(2).toLowerCase()
      );
      expect(txreceipt1.logs[1].topics[2]).to.equal(
        "0x000000000000000000000000" + deployer.address.slice(2).toLowerCase()
      );
      expect(txreceipt1.logs[1].topics[3]).to.equal(
        "0x000000000000000000000000" + token.target.slice(2).toLowerCase()
      );

      //("args:", txreceipt.logs[1].args);
      expect(await token.balanceOf(proxy.target)).to.equal(0);
    });

    it("Test deposit 1  ether and  withdraw 1 ether", async function () {
      const { token, proxy, deployer, signer1, signer2 } =
        await loadFixture(deployFixture);

      let tokenAddress = token.target;
      let vaultAddress = proxy.target;

      let result = await proxy
        .connect(deployer)
        .depositETH(deployer.address, { value: ETH });

      let txreceipt = await result.wait();

      expect(await provider.getBalance(proxy.target)).to.equal(ETH);

      let time = Math.round(Date.now() / 1000);

      let requestID = 100;

      let sig0 = createSignature(
        deployer,
        deployer.address,
        ETH,
        tokenAddress,
        time + 3600 * 24,
        requestID,
        vaultAddress,
        1
      );
      let sig1 = createSignature(
        signer1,
        deployer.address,
        ETH,
        tokenAddress,
        time + 3600 * 24,
        requestID,
        vaultAddress,
        1
      );

      let result1 = await proxy
        .connect(deployer)
        .withdrawETH(
          deployer.address,
          ETH,
          time + 3600 * 24,
          requestID,
          [deployer.address, signer1.address],
          [sig0, sig1]
        );

      let txreceipt1 = await result1.wait();

      //console.log("events", txreceipt1.logs);
      let args = txreceipt1.logs[0].args;

      expect(txreceipt1.logs[0].topics[0]).to.equal(
        "0xfbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db"
      );
      expect(args[0]).to.equal(deployer.address);
      expect(args[1]).to.equal(deployer.address);
      expect(args[2]).to.equal("0x0000000000000000000000000000000000000000");
      //amount
      expect(args[3]).to.equal(1000000000000000000n);
      //requestId
      expect(args[4]).to.equal(100n);

      expect(await token.balanceOf(proxy.target)).to.equal(0);
    });

    it("Test deposit 100  USDT , change signer ,  withdraw 100 USDT", async function () {
      const { lock } = await loadFixture(deployFixture);

      const { token, proxy, deployer, signer1, signer2, signer3 } =
        await loadFixture(deployFixture);

      let tokenAddress = token.target;
      let vaultAddress = proxy.target;

      await token.connect(deployer).approve(proxy.target, 1000000 * 10000000);

      let result = await proxy
        .connect(deployer)
        .depositERC20(token.target, 100 * 1000000, deployer.address);

      await result.wait();

      expect(await token.balanceOf(proxy.target)).to.equal(100 * 1000000);

      await expect(
        proxy
          .connect(deployer)
          .changeSigners([signer1.address, signer2.address, signer3.address])
      ).to.emit(proxy, "SignersUpdate");

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
            100000000,
            tokenAddress,
            time + 3600 * 24,
            requestID,
            [deployer.address, signer1.address],
            [sig0, sig1]
          )
      ).to.be.revertedWith("not allowed signer");

      expect(await proxy.isAllowedSigner(deployer.address)).to.equal(false);
      //("args:", txreceipt.logs[1].args);
      expect(await token.balanceOf(proxy.target)).to.equal(100000000);

      // signer3 sign

      sig0 = createSignature(
        signer3,
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
            100000000,
            tokenAddress,
            time + 3600 * 24,
            requestID,
            [signer3.address, signer1.address],
            [sig0, sig1]
          )
      ).to.emit(proxy, "Withdraw");

      await expect(
        proxy
          .connect(deployer)
          .withdrawERC20(
            deployer.address,
            100000000,
            tokenAddress,
            time + 3600 * 24,
            requestID,
            [signer3.address, signer1.address],
            [sig0, sig1]
          )
      ).to.be.revertedWith("repeated request");
    });
  });

  describe("Owner  vault operation", function () {
    it("Test withdraw  vault  USDT by owner when emergency", async function () {
      const { lock } = await loadFixture(deployFixture);

      const { token, proxy, deployer, signer1, signer2 } =
        await loadFixture(deployFixture);

      let tokenAddress = token.target;
      let vaultAddress = proxy.target;

      await token.connect(deployer).approve(proxy.target, 1000000 * 10000000);

      // deposit 3 times
      await proxy
        .connect(deployer)
        .depositERC20(token.target, 100 * 1000000, deployer.address);

      await token.connect(signer1).approve(proxy.target, 1000000 * 10000000);

      await proxy
        .connect(signer1)
        .depositERC20(token.target, 100 * 1000000, signer1.address);

      await token.connect(signer2).approve(proxy.target, 1000000 * 10000000);

      await proxy
        .connect(signer2)
        .depositERC20(token.target, 100 * 1000000, signer2.address);

      // check vault balance
      expect(await token.balanceOf(proxy.target)).to.equal(300 * 1000000);

      // withdraw by user, revert
      await expect(
        proxy
          .connect(signer1)
          .withdrawERC20TokenByOwner(
            tokenAddress,
            signer1.address,
            300 * 1000000
          )
      ).to.be.reverted;

      // withdraw by owner, but excessed balance
      await expect(
        proxy
          .connect(deployer)
          .withdrawERC20TokenByOwner(
            tokenAddress,
            signer1.address,
            400 * 1000000
          )
      ).to.be.revertedWith("NOT_ENOUGH_BALANCE");

      // withdraw by owner, success
      await expect(
        proxy
          .connect(deployer)
          .withdrawERC20TokenByOwner(
            tokenAddress,
            signer1.address,
            300 * 1000000
          )
      ).to.emit(token, "Transfer");

      expect(await token.balanceOf(proxy.target)).to.equal(0);
    });

    it("Test withdraw  vault  ETH by owner when emergency", async function () {
      const { token, proxy, deployer, signer1, signer2 } =
        await loadFixture(deployFixture);

      let tokenAddress = token.target;
      let vaultAddress = proxy.target;

      // deposit eth 3 times
      await proxy
        .connect(deployer)
        .depositETH(deployer.address, { value: ETH });

      await proxy.connect(signer1).depositETH(signer1.address, { value: ETH });

      await proxy.connect(signer2).depositETH(signer2.address, { value: ETH });

      expect(await provider.getBalance(proxy.target)).to.equal(BigInt(3) * ETH);

      // withdraw by user, revert
      await expect(
        proxy
          .connect(signer1)
          .withdrawETHByOwner(signer1.address, BigInt(3) * ETH)
      ).to.be.reverted;

      // withdraw by owner, but excessed balance
      await expect(
        proxy
          .connect(deployer)
          .withdrawETHByOwner(signer1.address, BigInt(4) * ETH)
      ).to.be.revertedWith("NOT_ENOUGH_BALANCE");

      expect(await provider.getBalance(proxy.target)).to.equal(BigInt(3) * ETH);

      // withdraw by owner, success
      await expect(
        proxy
          .connect(deployer)
          .withdrawETHByOwner(signer1.address, BigInt(3) * ETH)
      );

      expect(await token.balanceOf(proxy.target)).to.equal(0);
    });

    it("Test deposit 100  USDT and  withdraw 100 USDT when paused", async function () {
      const { lock } = await loadFixture(deployFixture);

      const { token, proxy, deployer, signer1, signer2 } =
        await loadFixture(deployFixture);

      let tokenAddress = token.target;
      let vaultAddress = proxy.target;

      await token.connect(deployer).approve(proxy.target, 10000000 * 10000000);
      await token.connect(signer1).approve(proxy.target, 10000000 * 10000000);

      await proxy
        .connect(signer1)
        .depositERC20(token.target, 100 * 1000000, signer1.address);

      await proxy.connect(deployer).pause();

      await expect(
        proxy
          .connect(signer1)
          .depositERC20(token.target, 100 * 1000000, signer1.address)
      ).to.be.reverted;

      expect(await token.balanceOf(proxy.target)).to.equal(100 * 1000000);

      let time = Math.round(Date.now() / 1000) + 3600 * 24;

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
            100000000,
            tokenAddress,
            time + 3600 * 24,
            requestID,
            [deployer.address, signer1.address],
            [sig0, sig1]
          )
      ).to.be.reverted;

      expect(await token.balanceOf(proxy.target)).to.equal(100 * 1000000);

      await proxy.connect(deployer).unpause();

      await proxy
        .connect(deployer)
        .withdrawERC20(
          deployer.address,
          100000000,
          tokenAddress,
          time + 3600 * 24,
          requestID,
          [deployer.address, signer1.address],
          [sig0, sig1]
        );

      //("args:", txreceipt.logs[1].args);
      expect(await token.balanceOf(proxy.target)).to.equal(0);
    });
  });
  describe("funciton check", function () {
    it(" deposit token not in whitelist", async function () {
      const { token, proxy, deployer, signer1, signer2 } =
        await loadFixture(deployFixture);

      const tokenNew = await ethers.deployContract(
        "SimpleToken",
        ["Test Token 1", "USDTM1", 6, 1000000000],
        deployer
      );

      await tokenNew.waitForDeployment();

      await token.connect(deployer).approve(proxy.target, 1000000 * 10000000);

      await expect(
        proxy
          .connect(deployer)
          .depositERC20(tokenNew.target, 100 * 1000000, deployer.address)
      ).to.be.revertedWith("Token not allowed");
    });
    it(" owner set token as whitelist", async function () {
      const { token, proxy, deployer, signer1, signer2 } =
        await loadFixture(deployFixture);

      const tokenNew = await ethers.deployContract(
        "SimpleToken",
        ["Test Token 1", "USDTM1", 6, 1000000000],
        deployer
      );

      await tokenNew.waitForDeployment();

      await tokenNew
        .connect(deployer)
        .approve(proxy.target, 1000000 * 10000000);

      await expect(
        proxy
          .connect(deployer)
          .depositERC20(tokenNew.target, 100 * 1000000, deployer.address)
      ).to.be.revertedWith("Token not allowed");

      await expect(
        proxy.setWithdrawLimit(tokenNew.target, 1000000 * 1000000)
      ).to.emit(proxy, "WithdrawLimitUpdate");

      await expect(
        proxy
          .connect(deployer)
          .depositERC20(tokenNew.target, 100 * 1000000, deployer.address)
      ).to.emit(proxy, "Deposit");
    });

    it(" ETH calcSigHash check ", async function () {
      const { token, proxy, deployer, signer1, signer2 } =
        await loadFixture(deployFixture);

      let to = deployer.address;
      let amount = 100000000;
      let expireTime = Date.now() + 3600 * 24;
      let requestID = 100;
      let vaultAddress = proxy.target;

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

      const payloadHash = ethers.keccak256(payload);

      let ethaddr = "0x0000000000000000000000000000000000000000";

      expect(
        await proxy.calcSigHash(to, amount, ethaddr, expireTime, requestID)
      ).to.equal(payloadHash);
    });

    it(" ERC20 calcSigHash check ", async function () {
      const { token, proxy, deployer, signer1, signer2 } =
        await loadFixture(deployFixture);

      let to = deployer.address;
      let amount = 100000000;
      let expireTime = Math.round(Date.now() / 1000) + 3600 * 24;
      let requestID = 100;
      let vaultAddress = proxy.target;

      encodeString = [
        "ERC20",
        31337,
        to,
        amount,
        token.target,
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

      const payloadHash = ethers.keccak256(payload);

      expect(
        await proxy.calcSigHash(to, amount, token.target, expireTime, requestID)
      ).to.equal(payloadHash);
    });
  });

  describe("uups upgrade  test", function () {
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

      expect(await proxy1.getTokenWithdrawLimit(token.target)).to.equal(
        `200000000000`
      );
      expect(proxy1.target).to.equal(proxy.target);

      expect(
        await upgrades.erc1967.getImplementationAddress(proxy.target)
      ).to.not.equal(implementationAddress);
    });
  });
});
