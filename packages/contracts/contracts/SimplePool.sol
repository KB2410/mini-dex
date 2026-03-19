// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimplePool
 * @dev AMM liquidity pool for ETH-to-GeminiToken swaps
 * Implements constant product market maker formula with reentrancy protection
 */
contract SimplePool is ReentrancyGuard {
    // State variables
    address public immutable token;
    uint256 public ethReserve;
    uint256 public tokenReserve;
    mapping(address => uint256) public liquidityProvided;

    // Custom errors
    error ZeroAmount();
    error TokenTransferFailed();
    error InsufficientLiquidity(uint256 requested, uint256 available);
    error InvalidSwapAmount(uint256 ethAmount, uint256 tokenOutput);
    error InsufficientEthSent(uint256 required, uint256 sent);

    // Events
    event LiquidityAdded(
        address indexed provider,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 timestamp
    );

    event LiquidityRemoved(
        address indexed provider,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 timestamp
    );

    event SwapExecuted(
        address indexed user,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 timestamp
    );

    /**
     * @dev Constructor initializes the pool with the token address
     * @param _token Address of the GeminiToken contract
     */
    constructor(address _token) {
        token = _token;
    }

    /**
     * @dev Adds liquidity to the pool by depositing ETH and tokens
     * @param tokenAmount The amount of tokens to deposit
     * Requirements:
     * - msg.value (ETH amount) must be greater than zero
     * - tokenAmount must be greater than zero
     * - Caller must have approved this contract to spend tokenAmount
     * - Caller must have sufficient token balance
     */
    function addLiquidity(uint256 tokenAmount) external payable nonReentrant {
        // Validate non-zero amounts
        if (msg.value == 0 || tokenAmount == 0) revert ZeroAmount();

        // Transfer tokens from user to this contract
        // GeminiToken.transferFrom returns bool
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature(
                "transferFrom(address,address,uint256)",
                msg.sender,
                address(this),
                tokenAmount
            )
        );

        // Check if the call succeeded and returned true
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert TokenTransferFailed();
        }

        // Update reserves
        ethReserve += msg.value;
        tokenReserve += tokenAmount;

        // Track liquidity provided by this user
        liquidityProvided[msg.sender] += msg.value;

        // Emit event
        emit LiquidityAdded(msg.sender, msg.value, tokenAmount, block.timestamp);
    }

    /**
     * @dev Removes liquidity from the pool with proportional withdrawal
     * @param liquidityAmount The amount of liquidity to withdraw
     * Requirements:
     * - liquidityAmount must not exceed user's provided liquidity
     * - Proportional ETH and token amounts are calculated and returned
     * - State is updated before external calls (checks-effects-interactions)
     */
    function removeLiquidity(uint256 liquidityAmount) external nonReentrant {
        // Validate sufficient user liquidity
        uint256 userLiquidity = liquidityProvided[msg.sender];
        if (liquidityAmount > userLiquidity) {
            revert InsufficientLiquidity(liquidityAmount, userLiquidity);
        }

        // Calculate total liquidity (sum of all ETH provided)
        uint256 totalLiquidity = ethReserve;

        // Calculate proportional amounts
        // ethAmount = (liquidityAmount * ethReserve) / totalLiquidity
        // tokenAmount = (liquidityAmount * tokenReserve) / totalLiquidity
        uint256 ethAmount = (liquidityAmount * ethReserve) / totalLiquidity;
        uint256 tokenAmount = (liquidityAmount * tokenReserve) / totalLiquidity;

        // Update state variables before external calls (checks-effects-interactions pattern)
        liquidityProvided[msg.sender] -= liquidityAmount;
        ethReserve -= ethAmount;
        tokenReserve -= tokenAmount;

        // Transfer tokens to user
        (bool tokenSuccess, bytes memory data) = token.call(
            abi.encodeWithSignature(
                "transfer(address,uint256)",
                msg.sender,
                tokenAmount
            )
        );

        if (!tokenSuccess || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert TokenTransferFailed();
        }

        // Transfer ETH to user
        (bool ethSuccess, ) = msg.sender.call{value: ethAmount}("");
        if (!ethSuccess) {
            revert TokenTransferFailed();
        }

        // Emit event
        emit LiquidityRemoved(msg.sender, ethAmount, tokenAmount, block.timestamp);
    }

    /**
     * @dev Swaps ETH for tokens using constant product formula
     * @return tokenAmount The amount of tokens received
     * Requirements:
     * - msg.value (ETH amount) must be greater than zero
     * - Token output must be greater than zero
     * - Pool must have sufficient token liquidity
     * - Uses formula: tokenOut = (tokenReserve * ethIn) / (ethReserve + ethIn)
     */
    function swapEthForToken() external payable nonReentrant returns (uint256) {
        // Validate non-zero ETH sent
        if (msg.value == 0) revert ZeroAmount();

        // Calculate token output using constant product formula
        // tokenOut = (tokenReserve * msg.value) / (ethReserve + msg.value)
        uint256 tokenOutput = (tokenReserve * msg.value) / (ethReserve + msg.value);

        // Validate non-zero output
        if (tokenOutput == 0) {
            revert InvalidSwapAmount(msg.value, tokenOutput);
        }

        // Validate sufficient pool liquidity
        if (tokenOutput > tokenReserve) {
            revert InsufficientLiquidity(tokenOutput, tokenReserve);
        }

        // Update reserves before external calls (checks-effects-interactions pattern)
        ethReserve += msg.value;
        tokenReserve -= tokenOutput;

        // Transfer tokens to user
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature(
                "transfer(address,uint256)",
                msg.sender,
                tokenOutput
            )
        );

        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert TokenTransferFailed();
        }

        // Emit event
        emit SwapExecuted(msg.sender, msg.value, tokenOutput, block.timestamp);

        return tokenOutput;
    }

    /**
     * @dev Calculates the estimated token output for a given ETH input
     * @param ethAmount The amount of ETH to swap
     * @return tokenAmount The estimated amount of tokens that would be received
     * Uses formula: tokenOut = (tokenReserve * ethIn) / (ethReserve + ethIn)
     */
    function getSwapEstimate(uint256 ethAmount) external view returns (uint256 tokenAmount) {
        if (ethAmount == 0) return 0;
        
        // Calculate token output using constant product formula
        tokenAmount = (tokenReserve * ethAmount) / (ethReserve + ethAmount);
        
        return tokenAmount;
    }

    /**
     * @dev Returns current pool statistics
     * @return ethReserve Current ETH reserve in the pool
     * @return tokenReserve Current token reserve in the pool
     * @return totalLiquidity Total liquidity provided (sum of all ETH deposits)
     */
    function getPoolStats() external view returns (
        uint256,
        uint256,
        uint256
    ) {
        return (ethReserve, tokenReserve, ethReserve);
    }
}
