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
 Proxy contract 0x640A691bB8422C6e0252C9d4b3f6f09Df217434D
 getImplementationAddress 0xB4a3AefE93B004362080Cc702f568b6fc89b6cFA
```
