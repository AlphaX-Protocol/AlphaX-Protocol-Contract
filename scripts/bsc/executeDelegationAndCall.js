const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');


function hexStringToBuffer(hexstr) {
  return Buffer.from(hexstr.replace(/^0x/, ''), 'hex');
}

const main = async () => {
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider);

  // Read deployment info from JSON file
  const deploymentPath = path.join(__dirname, '../deployments', `${network.name}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found for network: ${network.name}`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const BATCH_CALL_DELEGATION_ADDRESS = deploymentInfo.contractAddress;

  console.log(`Using BatchCallAndSponsorat: ${BATCH_CALL_DELEGATION_ADDRESS}`);


  const tokenAddress = "0x604a4d7277088758d1284178d0dac21b2e661344";
  const vaultAddress = "0x536f8aaD0E74C5f64618665F4c93c82ec51dF1E0";
  const amount = 1000 * 10 ** 6; //1000 USDC

  const currentNonce = await ethers.provider.getTransactionCount(wallet.address);

  console.log('currentNonce:', currentNonce);

  //auth 
  const auth = await wallet.authorize({
    address: BATCH_CALL_DELEGATION_ADDRESS,
    nonce: currentNonce,
    chainId: '0x38', // 
  });

  console.log("Authorization created with nonce:", auth);

  // call 
  const alice = new ethers.Wallet(process.env.PRIVATE_KEY_ALICE, ethers.provider);


  const contractABI = [
    "function execute((address,uint256,bytes)[] calls) external payable",
    "function execute((address,uint256,bytes)[] calls, bytes signature) external payable",
    "function nonce() external view returns (uint256)"
  ];

  const erc20ABI = [
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function approve(address spender, uint256 amount) external returns (bool)",
  ];

  const vaultABI = [
    "function depositERC20(address token, uint256 amount, address receiver) external",
  ];


  const erc20Interface = new ethers.Interface(erc20ABI);
  const vaultInterface = new ethers.Interface(vaultABI);

  // Define sample transaction parameters for batch execution
  const calls = [
    [
      tokenAddress,
      0,
      //"0x095ea7b3000000000000000000000000536f8aaD0E74C5f64618665F4c93c82ec51dF1E0ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      erc20Interface.encodeFunctionData("approve", [vaultAddress, amount]),
    ],
    [
      vaultAddress,
      0,
      vaultInterface.encodeFunctionData("depositERC20", [tokenAddress, amount, wallet.address]),
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

  const delegatedContract = new ethers.Contract(
    wallet.address,
    contractABI,
    alice
  );

  const nonce = await delegatedContract.nonce();
  //const nonce = 0;  //first time
  console.log('contractNonce:', nonce);
  // const signature = await wallet.signMessage(ethers.getBytes());

  const structHash = ethers.keccak256(
    ethers.solidityPacked(["uint256", "bytes"], [BigInt(nonce), encodedCallBytes])
  );

  const domainTypehash = '0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218';

  //const domainTypehash = ethers.keccak256(ethers.getBytes("EIP712Domain(uint256 chainId,address verifyingContract)"));

  const domainSeparator = ethers.keccak256(
    ethers.solidityPacked(["bytes32", "uint256", "address"], [domainTypehash, 0x38, wallet.address])
  );


  const digest = ethers.keccak256(Buffer.concat(['0x1901', domainSeparator, structHash].map(str => hexStringToBuffer(str))));


  console.log('Digest:', digest);

  // 4. Alice signs the digest off-chain using her private key
  // const signature = await wallet.signingKey.sign({
  //   hash: toEthSignedMessageHash(digest),
  //   privateKey: wallet.privateKey,
  //   to: "hex",
  // });
  const signature = await wallet.signMessage(ethers.getBytes(digest));
  //console.log('Signature:', signature);


  const tx = await delegatedContract[
    "execute((address,uint256,bytes)[] calls, bytes signature) external payable"
  ](calls, signature,
    // { 
    //   type: 4,
    //   authorizationList: [auth],
    //   gasLimit: 10000000,
    // }
  );


  console.log("Sponsored transaction sent:", tx.hash);

  const receipt = await tx.wait();
  console.log("Receipt for non-sponsored transaction:", receipt);


}

main().then(() => {
  console.log('Execution completed');
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});