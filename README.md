# ALPHAX-PROTOCOL-Contract

The main function of the DEXVault to serve as a secure vault for depositing and withdrawing cryptocurrencies, both Ether (ETH) and ERC-20 tokens, with enhanced security features like multi-signature authorization and withdrawal limits. Accounting information are handled off-chain.

```shell

npx hardhat compile
npx hardhat test
npx hardhat coverage
npx hardhat node

```

## deploy script

```sh

npx hardhat run scripts/deployTokenERC20.js --network sepolia

npx hardhat run scripts/deploy-uups.js --network sepolia

```

```
Arbi:
 Proxy contract 0x552E7A55802f3350C707a243E402aa50Eda9D286
 getImplementationAddress 0xa61a6e696b7c566da42b80da27d96e7104bcec99


 ETH:
 Proxy contract 0xA61a6E696B7C566DA42B80dA27d96e7104bcec99
 getImplementationAddress 0x552E7A55802f3350C707a243E402aa50Eda9D286
```
