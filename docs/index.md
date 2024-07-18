# DEXVault API

## EVENT

### Deposit

```solidity
event Deposit(address sender, address receiver, address token, uint256 amount)
```

### Withdraw

```solidity
event Withdraw(address sender, address receiver, address token, uint256 amount, uint256 requestId)
```

### WithdrawLimitUpdate

```solidity
event WithdrawLimitUpdate(address token, uint256 oldLimit, uint256 newLimit)
```

### SignersUpdate

```solidity
event SignersUpdate(address[] oldSigners, address[] newSigners)
```

## METHOD

### initialize

```solidity
function initialize(address[] allowedSigners, address usdt, uint256 _withdrawUSDTLimit, uint256 _withdrawETHLimit) public
```

Set up a simple 2-3 multi-sig wallet by specifying the signers allowed to be used on this wallet.
2 signers will be require to send a transaction from this wallet.
Note: The sender is NOT automatically added to the list of signers.

#### Parameters

| Name                | Type      | Description                                                              |
| ------------------- | --------- | ------------------------------------------------------------------------ |
| allowedSigners      | address[] | An array of signers on the wallet                                        |
| usdt                | address   | The USDT contract address                                                |
| \_withdrawUSDTLimit | uint256   | The maximum amount of USDT that can be withdrawn in a single transaction |
| \_withdrawETHLimit  | uint256   | The maximum amount of ETH that can be withdrawn in a single transaction  |

### depositETH

```solidity
function depositETH(address receiver) public payable
```

Make a eth deposit.
Funds will be transferred from the sender and ETH will be deposited into this vault, and
generate a deposit event.

#### Parameters

| Name     | Type    | Description                                |
| -------- | ------- | ------------------------------------------ |
| receiver | address | The receiver address to receive the funds. |

### depositERC20

```solidity
function depositERC20(contract IERC20 token, uint256 amount, address receiver) public
```

Make a USDT deposit.
Funds will be transferred from the sender and USDT will be deposited into this vault, and
generate a deposit event.

#### Parameters

| Name     | Type            | Description                                |
| -------- | --------------- | ------------------------------------------ |
| token    | contract IERC20 | The token address .                        |
| amount   | uint256         | The token amount.                          |
| receiver | address         | The receiver address to receive the funds. |

### withdrawETH

```solidity
function withdrawETH(address payable to, uint256 amount, uint256 expireTime, uint256 requestId, address[] allSigners, bytes[] signatures) public
```

Withdraw ETHER from this wallet using 2 signers.

#### Parameters

| Name       | Type            | Description                                                          |
| ---------- | --------------- | -------------------------------------------------------------------- |
| to         | address payable | the destination address to send an outgoing transaction              |
| amount     | uint256         | the amount in Wei to be sent                                         |
| expireTime | uint256         | the number of seconds since 1970 for which this transaction is valid |
| requestId  | uint256         | the unique request id                                                |
| allSigners | address[]       | all signers who sign the tx                                          |
| signatures | bytes[]         | the signatures of tx                                                 |

### withdrawERC20

```solidity
function withdrawERC20(address to, uint256 amount, address token, uint256 expireTime, uint256 requestId, address[] allSigners, bytes[] signatures) public
```

Withdraw ERC20 from this wallet using 2 signers.

#### Parameters

| Name       | Type      | Description                                                          |
| ---------- | --------- | -------------------------------------------------------------------- |
| to         | address   | the destination address to send an outgoing transaction              |
| amount     | uint256   | the amount in Wei to be sent                                         |
| token      | address   | the address of the erc20 token contract                              |
| expireTime | uint256   | the number of seconds since 1970 for which this transaction is valid |
| requestId  | uint256   | the unique request id                                                |
| allSigners | address[] | all signer who sign the tx                                           |
| signatures | bytes[]   | the signatures of tx                                                 |

### withdrawERC20TokenByOwner

```solidity
function withdrawERC20TokenByOwner(address token, address to, uint256 amount) external returns (bool)
```

For emergency exit ,owner must be gnosis safe wallet

#### Parameters

| Name   | Type    | Description                                             |
| ------ | ------- | ------------------------------------------------------- |
| token  | address | the address of the erc20 token contract                 |
| to     | address | the destination address to send an outgoing transaction |
| amount | uint256 | the amount                                              |

### withdrawETHByOwner

```solidity
function withdrawETHByOwner(address to, uint256 amount) external returns (bool)
```

For emergency exit ,owner must be gnosis safe wallet

#### Parameters

| Name   | Type    | Description                                             |
| ------ | ------- | ------------------------------------------------------- |
| to     | address | the destination address to send an outgoing transaction |
| amount | uint256 | the amount in wei                                       |

## OTHERS API

### pause

```solidity
function pause() public
```

### unpause

```solidity
function unpause() public
```

### receive

```solidity
receive() external payable
```

Gets called when a transaction is received without calling a method

### setWithdrawLimit

```solidity
function setWithdrawLimit(address token, uint256 withdrawLimit) external
```

Set token withdraw limit by owner

#### Parameters

| Name          | Type    | Description                                           |
| ------------- | ------- | ----------------------------------------------------- |
| token         | address | the token address                                     |
| withdrawLimit | uint256 | the amount withdraw limit , 0 means not allowed token |

### changeSigners

```solidity
function changeSigners(address[] allowedSigners) external
```

### \_authorizeUpgrade

```solidity
function _authorizeUpgrade(address) internal
```

### isAllowedSigner

```solidity
function isAllowedSigner(address signer) public view returns (bool)
```

Determine if an address is a signer on this wallet

#### Parameters

| Name   | Type    | Description      |
| ------ | ------- | ---------------- |
| signer | address | address to check |

### getSigners

```solidity
function getSigners() public view returns (address[])
```

Get the signers of this vault

### tryInsertRequestId

```solidity
function tryInsertRequestId(uint256 chainId, uint256 requestId, address to, uint256 amount, address token) internal
```

Verify that the request id has not been used before and inserts it. Throws if the request ID was not accepted.

#### Parameters

| Name      | Type    | Description                                             |
| --------- | ------- | ------------------------------------------------------- |
| chainId   | uint256 |                                                         |
| requestId | uint256 | the unique request id                                   |
| to        | address | the destination address to send an outgoing transaction |
| amount    | uint256 | the amount in Wei to be sent                            |
| token     | address | the address of the ERC20 contract                       |

### calcSigHash

```solidity
function calcSigHash(address to, uint256 amount, address token, uint256 expireTime, uint256 requestId) public view returns (bytes32)
```

calcSigHash is a helper function that to help you generate the sighash needed for withdrawal.

#### Parameters

| Name       | Type    | Description                                                          |
| ---------- | ------- | -------------------------------------------------------------------- |
| to         | address | the destination address                                              |
| amount     | uint256 | the amount in Wei to be sent                                         |
| token      | address | the address of the ERC20 contract                                    |
| expireTime | uint256 | the number of seconds since 1970 for which this transaction is valid |
| requestId  | uint256 | the unique request id                                                |
