const { upgrades } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

function hexStringToBuffer(hexstr) {
  return Buffer.from(hexstr.replace(/^0x/, ''), 'hex');
}



describe("BatchCallAndSponsor", function () {
  const ETH = BigInt("1000000000000000000");
  const provider = ethers.provider;

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFixture() {
    // Get the Signers here.
    const [deployer, signer1, signer2, signer3] = await ethers.getSigners();
    console.log("deployer", deployer.address);
    console.log("signer1", signer1.address);

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

    const batchCallAndSponsorFactory = await ethers.getContractFactory("BatchCallAndSponsor");
    let batchCallAndSponsor = await batchCallAndSponsorFactory.deploy();
    await batchCallAndSponsor.waitForDeployment();
    console.log("BatchCallAndSponsor", batchCallAndSponsor.target);

    // Fixtures can return anything you consider useful for your tests
    return {
      token,
      proxy,
      batchCallAndSponsor,
      deployer,
      signer1,
      signer2,
      signer3,
      implementationAddress,

    };
  }

  describe("execute batch call and sponsor", function () {
    it("Test deposit 100  USDT and delegate", async function () {
      const { token, proxy, batchCallAndSponsor, deployer, signer1, signer2 } =
        await loadFixture(deployFixture);

      await token.connect(deployer).approve(proxy.target, 1000000 * 10000000);

      let result = await proxy
        .connect(deployer)
        .depositERC20(token.target, 100 * 1000000, deployer.address);

      let txreceipt = await result.wait();

      //  console.log("logs--", txreceipt.logs);

      const currentNonce = await ethers.provider.getTransactionCount(deployer.address);


      console.log('currentNonce:', currentNonce);

      const auth = await deployer.authorize({
        address: batchCallAndSponsor.target,
        nonce: currentNonce + 1,
        chainId: 31337, // 
      });
      console.log('auth:', auth);


      const contractABI = [
        "function execute((address,uint256,bytes)[] calls) external payable",
        "function execute((address,uint256,bytes)[] calls, bytes signature) external payable",
        "function nonce() external view returns (uint256)"
      ];

      // Define sample transaction parameters for batch execution
      const calls = [
        [
          "0x604a4d7277088758d1284178d0dac21b2e661344",
          0,
          "0x095ea7b3000000000000000000000000536f8aaD0E74C5f64618665F4c93c82ec51dF1E0ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        ],
        [
          "0x536f8aaD0E74C5f64618665F4c93c82ec51dF1E0",
          0,
          "0x1828686a000000000000000000000000604a4d7277088758d1284178d0dac21b2e6613440000000000000000000000000000000000000000000000000000000000989680000000000000000000000000F62F93f8D0396Cf859599dc85960bed119DdF7AB",
        ]
      ];


      const encodedCallBytes = ethers.solidityPacked(
        [
          "address", "uint256", "bytes",
          "address", "uint256", "bytes"
        ],
        [
          calls[0][0], calls[0][1], calls[0][2],
          calls[1][0], calls[1][1], calls[1][2]
        ]
      );

      //console.log('encodedCallBytes:', encodedCallBytes);


      // const delegatedContract = new ethers.Contract(
      //   deployer.address,
      //   contractABI,
      //   signer1
      // );

      const nonce = 0;  //first time

      // const domainTypehash = '0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218';

      const structHash = ethers.keccak256(
        ethers.solidityPacked(["uint256", "bytes"], [BigInt(nonce), encodedCallBytes])
      );


      const domainTypehash = ethers.keccak256(ethers.getBytes("EIP712Domain(uint256 chainId,address verifyingContract)"));
      //0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218
      console.log('domainTypehash:', domainTypehash);

      const domainSeparator = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "uint256", "address"], [domainTypehash, 31337, batchCallAndSponsor.target])
      );

      console.log('domainSeparator:', domainSeparator);

      // const digest = ethers.keccak256(
      //   Buffer.concat(['0x1901',domainSeparator, structhash])
      // );

      const digest = ethers.keccak256(Buffer.concat(['0x1901', domainSeparator, structHash].map(str => hexStringToBuffer(str))));

      // const digest = ethers.keccak256(
      //   ethers.solidityPacked(["uint256","bytes32", "bytes32"], [0x1901, domainSeparator, structHash])
      // );
      console.log('Digest:', digest);

      const signature = await deployer.signMessage(ethers.getBytes(digest));
      console.log('Signature:', signature);


      // const tx = await delegatedContract[
      //   "execute((address,uint256,bytes)[] calls, bytes signature) external payable"
      // ](calls, signature,
      //   { 
      //     type: 4,
      //     authorizationList: [auth],
      //   }
      //  );

      const tx = await batchCallAndSponsor.connect(deployer)[
        "execute((address,uint256,bytes)[] calls, bytes signature) external payable"
      ](calls, signature);


      console.log(" transaction sent:", tx.hash);

      const receipt = await tx.wait();
      // console.log("Receipt for non-sponsored transaction:", receipt);





    });


  });

});
