const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

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

  const currentNonce = await ethers.provider.getTransactionCount(wallet.address);

  console.log('currentNonce:', currentNonce);

  //auth 
  const auth = await wallet.authorize({
    address: BATCH_CALL_DELEGATION_ADDRESS,
    nonce: currentNonce+1,
    chainId: '0x38', // 
  });

  console.log("Authorization created with nonce:", auth.signature);

  // call 
  const alice = new ethers.Wallet(process.env.PRIVATE_KEY_ALICE, ethers.provider);


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

  console.log('encodedCallBytes:', encodedCallBytes);

  const delegatedContract = new ethers.Contract(
    wallet.address,
    contractABI,
    alice
  );

  const nonce = await delegatedContract.nonce();
  //const nonce = 0;  first time
  console.log('contractNonce:', nonce);
  // const signature = await wallet.signMessage(ethers.getBytes());


  const digest = ethers.keccak256(
    ethers.solidityPacked(["uint256", "bytes"], [BigInt(nonce), encodedCallBytes])
  );

  console.log('Digest:', digest);

  // 4. Alice signs the digest off-chain using her private key
  // const signature = await wallet.signingKey.sign({
  //   hash: toEthSignedMessageHash(digest),
  //   privateKey: wallet.privateKey,
  //   to: "hex",
  // });
  const signature = await wallet.signMessage(ethers.getBytes(digest));
  console.log('Signature:', signature);


  const tx = await delegatedContract[
    "execute((address,uint256,bytes)[] calls, bytes signature) external payable"
  ](calls, signature, );
  
  
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