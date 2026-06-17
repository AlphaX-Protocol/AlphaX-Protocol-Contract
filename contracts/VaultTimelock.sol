// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title VaultTimelock
 * @notice Intermediary admin contract for DEXVaultV1.
 *         - Emergency operations (pause, emergency withdraw): callable by emergencyAdmin immediately.
 *         - High-risk operations (changeSigners, upgrade, limits): only callable by TimelockController.
 *         DEXVaultV1 remains unmodified; this contract is set as its owner.
 */
interface IVaultAdmin {
    function pause() external;
    function unpause() external;
    function withdrawERC20TokenByOwner(address token, address to, uint256 amount) external returns (bool);
    function withdrawETHByOwner(address to, uint256 amount) external returns (bool);
    function changeSigners(address[] calldata allowedSigners) external;
    function setWithdrawLimit(address token, uint256 withdrawLimit) external;
    function setDailyWithdrawLimit(address token, uint256 dailyWithdrawLimit) external;
    function upgradeToAndCall(address newImplementation, bytes memory data) external;
    function transferOwnership(address newOwner) external;
}

contract VaultTimelock {
    address public vault;
    address public emergencyAdmin;
    address public timelockController;

    event EmergencyAdminTransferred(address indexed oldAdmin, address indexed newAdmin);
    event TimelockControllerUpdated(address indexed oldController, address indexed newController);

    modifier onlyEmergency() {
        require(msg.sender == emergencyAdmin, "VaultTimelock: not emergency admin");
        _;
    }

    modifier onlyTimelock() {
        require(msg.sender == timelockController, "VaultTimelock: not timelock");
        _;
    }

    modifier onlyEmergencyOrTimelock() {
        require(
            msg.sender == emergencyAdmin || msg.sender == timelockController,
            "VaultTimelock: not authorized"
        );
        _;
    }

    constructor(address _vault, address _emergencyAdmin, address _timelockController) {
        require(_vault != address(0), "invalid vault");
        require(_emergencyAdmin != address(0), "invalid emergency admin");
        require(_timelockController != address(0), "invalid timelock controller");

        vault = _vault;
        emergencyAdmin = _emergencyAdmin;
        timelockController = _timelockController;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  PATH A: Emergency operations — immediate, only emergencyAdmin
    // ═══════════════════════════════════════════════════════════════════════

    function pause() external onlyEmergency {
        IVaultAdmin(vault).pause();
    }

    function unpause() external onlyEmergency {
        IVaultAdmin(vault).unpause();
    }

    function emergencyWithdrawERC20(address token, address to, uint256 amount)
        external
        onlyEmergency
    {
        IVaultAdmin(vault).withdrawERC20TokenByOwner(token, to, amount);
    }

    function emergencyWithdrawETH(address to, uint256 amount)
        external
        onlyEmergency
    {
        IVaultAdmin(vault).withdrawETHByOwner(to, amount);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  PATH B: High-risk operations — only via TimelockController
    // ═══════════════════════════════════════════════════════════════════════

    function changeSigners(address[] calldata newSigners) external onlyTimelock {
        IVaultAdmin(vault).changeSigners(newSigners);
    }

    function setWithdrawLimit(address token, uint256 limit) external onlyTimelock {
        IVaultAdmin(vault).setWithdrawLimit(token, limit);
    }

    function setDailyWithdrawLimit(address token, uint256 limit) external onlyTimelock {
        IVaultAdmin(vault).setDailyWithdrawLimit(token, limit);
    }

    function upgrade(address newImplementation, bytes calldata data) external onlyTimelock {
        IVaultAdmin(vault).upgradeToAndCall(newImplementation, data);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Self-management — changing this contract's own config
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Transfer emergencyAdmin. Must go through timelock to prevent abuse.
    function setEmergencyAdmin(address newAdmin) external onlyTimelock {
        require(newAdmin != address(0), "invalid address");
        emit EmergencyAdminTransferred(emergencyAdmin, newAdmin);
        emergencyAdmin = newAdmin;
    }

    /// @notice Update timelockController. Must go through timelock.
    function setTimelockController(address newController) external onlyTimelock {
        require(newController != address(0), "invalid address");
        emit TimelockControllerUpdated(timelockController, newController);
        timelockController = newController;
    }

    /// @notice Transfer vault ownership away from this contract. Must go through timelock.
    function transferVaultOwnership(address newOwner) external onlyTimelock {
        IVaultAdmin(vault).transferOwnership(newOwner);
    }
}
