// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "../DEXVault.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract DEXVaultMock is DEXVault {
    using SafeERC20 for IERC20;

    function getTokenWithdrawLimit(
        address token
    ) public view returns (uint256) {
        return tokenWithdrawLimit[token];
    }
    

    function getRequestInfo(uint256 requestId) public view returns (request memory) {
        return requests[requestId];
    }

 
}
