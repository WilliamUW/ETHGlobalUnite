// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CrossChainResolver
 * @dev Extended resolver for cross-chain swaps between Ethereum and NEAR/Aptos
 * Based on 1inch cross-chain resolver but extended for non-EVM chains
 * 
 * @custom:security-contact security@1inch.io
 */
contract CrossChainResolver is Ownable {
    using SafeERC20 for IERC20;

    // Events
    event SwapInitiated(
        bytes32 indexed orderHash,
        address indexed maker,
        address indexed srcToken,
        uint256 srcAmount,
        string dstChain,
        string dstToken,
        uint256 dstAmount,
        bytes32 hashLock,
        uint256 timelock
    );
    
    event SwapCompleted(
        bytes32 indexed orderHash,
        bytes32 secret
    );
    
    event SwapCancelled(
        bytes32 indexed orderHash
    );

    // Structs
    struct SwapOrder {
        address maker;
        address srcToken;
        uint256 srcAmount;
        string dstChain; // "NEAR" or "APTOS"
        string dstToken;
        string dstRecipient;
        uint256 dstAmount;
        bytes32 hashLock;
        uint256 timelock;
        bool completed;
        bool cancelled;
    }

    // State variables
    mapping(bytes32 => SwapOrder) public swapOrders;
    mapping(bytes32 => uint256) public deposits;
    mapping(string => bool) public supportedChains;
    
    uint256 public constant TIMELOCK_DURATION = 24 hours;
    uint256 public constant MIN_TIMELOCK = 1 hours;
    
    // Supported destination chains
    string public constant NEAR_CHAIN = "NEAR";
    string public constant APTOS_CHAIN = "APTOS";

    error InvalidTimelock();
    error OrderNotFound();
    error OrderAlreadyCompleted();
    error OrderAlreadyCancelled();
    error TimelockNotExpired();
    error InvalidSecret();
    error InsufficientDeposit();
    error UnsupportedChain();
    error TransferFailed();

    constructor(address initialOwner) Ownable(initialOwner) {
        supportedChains[NEAR_CHAIN] = true;
        supportedChains[APTOS_CHAIN] = true;
    }

    receive() external payable {}

    /**
     * @notice Initiate a cross-chain swap from Ethereum to NEAR/Aptos
     * @param orderHash Unique identifier for the swap order
     * @param srcToken Source token address on Ethereum
     * @param srcAmount Amount of source tokens to swap
     * @param dstChain Destination chain ("NEAR" or "APTOS")
     * @param dstToken Destination token identifier
     * @param dstRecipient Recipient address on destination chain
     * @param dstAmount Expected amount on destination chain
     * @param hashLock Hash of the secret for HTLC
     * @param timelock Timestamp when the swap expires
     */
    function initiateSwap(
        bytes32 orderHash,
        address srcToken,
        uint256 srcAmount,
        string calldata dstChain,
        string calldata dstToken,
        string calldata dstRecipient,
        uint256 dstAmount,
        bytes32 hashLock,
        uint256 timelock
    ) external {
        if (!supportedChains[dstChain]) revert UnsupportedChain();
        if (timelock < block.timestamp + MIN_TIMELOCK) revert InvalidTimelock();
        if (swapOrders[orderHash].maker != address(0)) revert OrderAlreadyCompleted();

        // Transfer tokens from maker to this contract
        if (srcToken == address(0)) {
            // Native ETH
            if (msg.value != srcAmount) revert InsufficientDeposit();
            deposits[orderHash] = srcAmount;
        } else {
            // ERC20 token
            IERC20(srcToken).safeTransferFrom(msg.sender, address(this), srcAmount);
            deposits[orderHash] = srcAmount;
        }

        // Store swap order
        swapOrders[orderHash] = SwapOrder({
            maker: msg.sender,
            srcToken: srcToken,
            srcAmount: srcAmount,
            dstChain: dstChain,
            dstToken: dstToken,
            dstRecipient: dstRecipient,
            dstAmount: dstAmount,
            hashLock: hashLock,
            timelock: timelock,
            completed: false,
            cancelled: false
        });

        emit SwapInitiated(
            orderHash,
            msg.sender,
            srcToken,
            srcAmount,
            dstChain,
            dstToken,
            dstAmount,
            hashLock,
            timelock
        );
    }

    /**
     * @notice Complete a swap by revealing the secret
     * @param orderHash The swap order identifier
     * @param secret The preimage of the hashLock
     * @param resolver Address to receive the tokens
     */
    function completeSwap(
        bytes32 orderHash,
        bytes32 secret,
        address resolver
    ) external {
        SwapOrder storage order = swapOrders[orderHash];
        
        if (order.maker == address(0)) revert OrderNotFound();
        if (order.completed) revert OrderAlreadyCompleted();
        if (order.cancelled) revert OrderAlreadyCancelled();
        if (block.timestamp > order.timelock) revert TimelockNotExpired();
        if (keccak256(abi.encodePacked(secret)) != order.hashLock) revert InvalidSecret();

        // Mark as completed
        order.completed = true;
        
        // Transfer tokens to resolver
        uint256 amount = deposits[orderHash];
        deposits[orderHash] = 0;
        
        if (order.srcToken == address(0)) {
            // Native ETH
            (bool success, ) = resolver.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // ERC20 token
            IERC20(order.srcToken).safeTransfer(resolver, amount);
        }

        emit SwapCompleted(orderHash, secret);
    }

    /**
     * @notice Cancel an expired swap and refund the maker
     * @param orderHash The swap order identifier
     */
    function cancelSwap(bytes32 orderHash) external {
        SwapOrder storage order = swapOrders[orderHash];
        
        if (order.maker == address(0)) revert OrderNotFound();
        if (order.completed) revert OrderAlreadyCompleted();
        if (order.cancelled) revert OrderAlreadyCancelled();
        if (block.timestamp <= order.timelock) revert TimelockNotExpired();

        // Mark as cancelled
        order.cancelled = true;
        
        // Refund tokens to maker
        uint256 amount = deposits[orderHash];
        deposits[orderHash] = 0;
        
        if (order.srcToken == address(0)) {
            // Native ETH
            (bool success, ) = order.maker.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // ERC20 token
            IERC20(order.srcToken).safeTransfer(order.maker, amount);
        }

        emit SwapCancelled(orderHash);
    }

    /**
     * @notice Get swap order details
     * @param orderHash The swap order identifier
     * @return order The swap order struct
     */
    function getSwapOrder(bytes32 orderHash) external view returns (SwapOrder memory order) {
        return swapOrders[orderHash];
    }

    /**
     * @notice Check if a swap order exists and is active
     * @param orderHash The swap order identifier
     * @return active True if the order exists and is not completed or cancelled
     */
    function isSwapActive(bytes32 orderHash) external view returns (bool active) {
        SwapOrder storage order = swapOrders[orderHash];
        return order.maker != address(0) && !order.completed && !order.cancelled && block.timestamp <= order.timelock;
    }

    /**
     * @notice Add support for a new destination chain (owner only)
     * @param chainName Name of the chain to support
     */
    function addSupportedChain(string calldata chainName) external onlyOwner {
        supportedChains[chainName] = true;
    }

    /**
     * @notice Remove support for a destination chain (owner only)
     * @param chainName Name of the chain to remove support for
     */
    function removeSupportedChain(string calldata chainName) external onlyOwner {
        supportedChains[chainName] = false;
    }

    /**
     * @notice Emergency withdrawal function (owner only)
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = owner().call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }
}