// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "../DEXVault.sol";

contract DEXVaultV1 is DEXVault {

 using SafeERC20 for IERC20;
      function depositWithPermit(
        address owner,
        address token,
        uint256 amount,
        address receiver,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public tokenWhitelist(address(token)) whenNotPaused nonReentrant {
        require(amount > 0, "Deposit amount must be greater than zero");

        IERC20Permit(token).permit(
            owner,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );

        IERC20(token).safeTransferFrom(owner, address(this), amount);

        emit Deposit(owner, receiver, token, amount);
    }  
}
