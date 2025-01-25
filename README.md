# ALPHAX-PROTOCOL-Contract

The main function of the DEXVault to serve as a secure vault for depositing and withdrawing cryptocurrencies, both Ether (ETH) and ERC-20 tokens, with enhanced security features like multi-signature authorization and withdrawal limits. Accounting information are handled off-chain.

Peripheral Contract: The DEXVaultRouter contract efficiently handles token swaps to USDT and vault deposits with 1inch integration, and is built to be upgradeable using UUPS. The contract emphasizes security and usability through reentrancy protection, support for permit-enabled tokens, and a flexible structure for handling different tokens, including native ETH.

The DEXSpotVault contract is  designed to facilitate spot token swaps and manage the withdrawal of spot ERC20 tokens within the AlphaX Protocol. Only operator can invoke the spot swap function , and only the DexVault  can withdraw spot ERC20 tokens. The contract is built to be upgradeable using UUPS, and supports multi-signature authorization for secure transaction execution.

## Build

```shell

npx hardhat compile
npx hardhat test
npx hardhat coverage
npx hardhat node
npx prettier --write --plugin=prettier-plugin-solidity 'contracts/**/*.sol'

```

## deploy script

```sh

npx hardhat run scripts/deployTokenERC20.js --network sepolia

npx hardhat run scripts/deploy-uups.js --network sepolia


npx hardhat run scripts/upgrade-uups.js --network sepolia


npx hardhat verify --network sepolia {address}

```

```
Arbi:
 Proxy contract 0x552E7A55802f3350C707a243E402aa50Eda9D286
 getImplementationAddress 0xa61a6e696b7c566da42b80da27d96e7104bcec99


 ETH:
 Proxy contract 0xA61a6E696B7C566DA42B80dA27d96e7104bcec99
 getImplementationAddress 0x552E7A55802f3350C707a243E402aa50Eda9D286
```

## 1inch Integration

## run

check owner address first!

arbi
no permit :

```
npx hardhat run scripts/arbi/oneinch/demo/oneinch-arbi-swap-test-no-permit.js --network arbitrum



```

permit :

```
npx hardhat run scripts/arbi/oneinch/demo/oneinch-arbi-swap-test.js --network arbitrum
```

for upgrade :

```

npx hardhat run scripts/arbi/oneinch/oneinch-arbi-upgrade.js --network arbitrum

```

for swap :

```
npx hardhat run scripts/arbi/oneinch/oneinch-arbi-swap.js --network arbitrum

```

ETH:

for upgrade :

```

npx hardhat run scripts/eth/oneinch/oneinch-eth-upgrade.js --network mainnet

```

for swap :

```
npx hardhat run scripts/eth/oneinch/oneinch-eth-swap.js --network mainnet

```

## Spot vault

### BASE
set spot vault address first:
1. npx hardhat run scripts/base/spot/deploy-origin-vault.js --network base
2. npx hardhat run scripts/base/spot/deploy-spot-vault.js --network base
3. set spot vault address in origin vault ;
4. transfer owner

 ### ETH
 1. npx hardhat run scripts/eth/spot/deploy-spot-vault.js --network mainnet  
 2. npx hardhat run scripts/eth/spot/deploy-origin-vault.js --network mainnet 
 3. upgradeAndCall origin vault implementation address
 4. set spot vault address in origin vault ;


