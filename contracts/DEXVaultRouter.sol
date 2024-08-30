// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./interfaces/IDEXVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract DEXVaultRouter is
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    using SafeERC20 for IERC20;

    IERC20 private constant ETH_ADDRESS =
        IERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    IERC20 private constant ZERO_ADDRESS = IERC20(address(0));

    address public USDT_ADDRESS; // USDT contract address
    address public AGGREGATION_ROUTER_ADDRESS; //1inch AggregationRouterV6 address
    address public VAULT_ADDRESS; //   dex vault address

    // Events
    event SwapToUSDTAndDeposit(
        address indexed owner,
        address indexed receiver,
        address indexed token,
        uint256 amount,
        uint256 usdtAmount
    );

    function initialize(
        address _usdtAddress,
        address _aggregationRouterV6,
        address _vaultAddress
    ) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        USDT_ADDRESS = _usdtAddress;
        AGGREGATION_ROUTER_ADDRESS = _aggregationRouterV6;
        VAULT_ADDRESS = _vaultAddress;
    }

    function swapToUSDTAndDeposit(
        address receiver,
        address token,
        uint256 amount,
        uint256 minReturnAmount,
        bytes calldata exchangeData
    ) public payable nonReentrant {
        bool isNativeToken = isNative(IERC20(token));
        if (isNativeToken) {
            require(msg.value == amount, "msg.value must be equal to amount");
        } else {
            require(msg.value == 0, "msg.value must be equal to 0");
        }

        uint256 usdtAmount = swapToUSDT(
            msg.sender,
            token,
            isNativeToken,
            amount,
            minReturnAmount,
            exchangeData
        );
        IDEXVault vault = IDEXVault(VAULT_ADDRESS);

        // usdt mainet need
        IERC20(USDT_ADDRESS).safeIncreaseAllowance(VAULT_ADDRESS, usdtAmount);

        vault.depositERC20(USDT_ADDRESS, usdtAmount, receiver);

        emit SwapToUSDTAndDeposit(
            msg.sender,
            receiver,
            token,
            amount,
            usdtAmount
        );
    }

    function swapWithPermitToUSDTAndDeposit(
        address owner,
        address token,
        uint256 amount,
        uint256 minReturnAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        bytes calldata exchangeData
    ) public nonReentrant {
        require(amount > 0, "Deposit amount must be greater than zero");

        // usdc
        IERC20Permit(token).permit(
            owner,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );

        uint256 usdtAmount = swapToUSDT(
            owner,
            token,
            false,
            amount,
            minReturnAmount,
            exchangeData
        );
        IDEXVault vault = IDEXVault(VAULT_ADDRESS);

        IERC20(USDT_ADDRESS).safeIncreaseAllowance(VAULT_ADDRESS, usdtAmount);

        vault.depositERC20(USDT_ADDRESS, usdtAmount, owner);

        emit SwapToUSDTAndDeposit(owner, owner, token, amount, usdtAmount);
    }

    function swapToUSDT(
        address owner,
        address token,
        bool isNativeToken,
        uint256 amount,
        uint256 minReturnAmount,
        bytes calldata exchangeData
    ) internal returns (uint256 returnAmount) {
        if (token == USDT_ADDRESS) {
            IERC20(USDT_ADDRESS).safeTransferFrom(owner, address(this), amount);
            return amount;
        }

        uint256 beforeSwapBalance = IERC20(USDT_ADDRESS).balanceOf(
            address(this)
        );

        if (!isNativeToken) {
            IERC20(token).safeTransferFrom(owner, address(this), amount);
            IERC20(token).safeIncreaseAllowance(
                AGGREGATION_ROUTER_ADDRESS,
                amount
            );
        }

        // Swap token
        (bool success, bytes memory returndata) = AGGREGATION_ROUTER_ADDRESS
            .call{value: msg.value}(exchangeData);

        require(success, "exchange failed");

        (returnAmount) = abi.decode(returndata, (uint256));
        
        require(
            returnAmount >= minReturnAmount,
            "received USDT less than minReturnAmount"
        );

        uint256 afterSwapBalance = IERC20(USDT_ADDRESS).balanceOf(
            address(this)
        );
        require(
            afterSwapBalance == beforeSwapBalance + returnAmount,
            "swap incorrect"
        );
        return returnAmount;
    }

    // override _authorizeUpgrade , uups
    function _authorizeUpgrade(address) internal override onlyOwner {}

    // Setter method for VAULT_ADDRESS
    function setVaultAddress(address _vaultAddress) external onlyOwner {
        require(_vaultAddress != address(0), "Invalid address");
        VAULT_ADDRESS = _vaultAddress;
    }

    function setAggregationRouterAddress(
        address _oneinchAddress
    ) external onlyOwner {
        require(_oneinchAddress != address(0), "Invalid address");
        AGGREGATION_ROUTER_ADDRESS = _oneinchAddress;
    }

    function isNative(IERC20 token_) internal pure returns (bool) {
        return (token_ == ZERO_ADDRESS || token_ == ETH_ADDRESS);
    }
}
