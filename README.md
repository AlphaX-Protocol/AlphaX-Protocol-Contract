# ALPHAX-PROTOCOL-Contract

The main function of the DEXVault to serve as a secure vault for depositing and withdrawing cryptocurrencies, both Ether (ETH) and ERC-20 tokens, with enhanced security features like multi-signature authorization and withdrawal limits. Accounting information are handled off-chain.

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

## 1inch

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
