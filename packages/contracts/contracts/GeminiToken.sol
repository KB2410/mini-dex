// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GeminiToken
 * @dev ERC-20 compliant token for the Mini-DEX system
 * Implements standard ERC-20 functions with custom errors for gas optimization
 */
contract GeminiToken {
    // State variables
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // Custom errors for gas optimization
    error InsufficientBalance(address account, uint256 requested, uint256 available);
    error InsufficientAllowance(address owner, address spender, uint256 requested, uint256 available);
    error TransferToZeroAddress();
    error ApproveToZeroAddress();
    error MintToZeroAddress();

    /**
     * @dev Constructor initializes token with name and symbol
     */
    constructor() {
        _name = "Gemini Token";
        _symbol = "GEMI";
    }

    /**
     * @dev Returns the name of the token
     */
    function name() external view returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token
     */
    function symbol() external view returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used for token amounts
     */
    function decimals() external pure returns (uint8) {
        return 18;
    }

    /**
     * @dev Returns the total token supply
     */
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev Returns the token balance of an account
     * @param account The address to query
     */
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev Returns the remaining number of tokens that spender is allowed to spend on behalf of owner
     * @param owner The address that owns the tokens
     * @param spender The address that can spend the tokens
     */
    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev Transfers tokens from caller to recipient
     * @param to The recipient address
     * @param amount The amount to transfer
     * @return bool indicating success
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        if (to == address(0)) revert TransferToZeroAddress();
        
        uint256 senderBalance = _balances[msg.sender];
        if (senderBalance < amount) {
            revert InsufficientBalance(msg.sender, amount, senderBalance);
        }

        _balances[msg.sender] = senderBalance - amount;
        _balances[to] += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @dev Sets allowance for spender to spend caller's tokens
     * @param spender The address authorized to spend
     * @param amount The maximum amount they can spend
     * @return bool indicating success
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        if (spender == address(0)) revert ApproveToZeroAddress();

        _allowances[msg.sender][spender] = amount;

        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @dev Transfers tokens from one address to another using allowance mechanism
     * @param from The address to transfer from
     * @param to The recipient address
     * @param amount The amount to transfer
     * @return bool indicating success
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (to == address(0)) revert TransferToZeroAddress();

        uint256 currentAllowance = _allowances[from][msg.sender];
        if (currentAllowance < amount) {
            revert InsufficientAllowance(from, msg.sender, amount, currentAllowance);
        }

        uint256 fromBalance = _balances[from];
        if (fromBalance < amount) {
            revert InsufficientBalance(from, amount, fromBalance);
        }

        _allowances[from][msg.sender] = currentAllowance - amount;
        _balances[from] = fromBalance - amount;
        _balances[to] += amount;

        emit Transfer(from, to, amount);
        return true;
    }

    /**
     * @dev Mints new tokens to an address (for initial token distribution)
     * @param to The address to receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        if (to == address(0)) revert MintToZeroAddress();

        _totalSupply += amount;
        _balances[to] += amount;

        emit Transfer(address(0), to, amount);
    }
}
