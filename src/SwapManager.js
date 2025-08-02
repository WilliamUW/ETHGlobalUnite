import { ETHNEAROrchestrator } from './orchestrator/ETHNEAROrchestrator.js';
import { ETHAptosOrchestrator } from './orchestrator/ETHAptosOrchestrator.js';
import { HTLCUtils, HTLCStateMachine } from './utils/HTLCUtils.js';
import { EventEmitter } from 'events';

/**
 * Main Swap Manager for 1inch Cross-Chain Fusion+ Extension
 * Coordinates bidirectional swaps between Ethereum and NEAR/Aptos
 */
export class SwapManager extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.ethNearOrchestrator = new ETHNEAROrchestrator(config);
        this.ethAptosOrchestrator = new ETHAptosOrchestrator(config);
        this.activeSwaps = new Map(); // orderHash -> swap details
        this.stateMachines = new Map(); // orderHash -> state machine
    }

    /**
     * Initialize all orchestrators
     */
    async initialize() {
        console.log('🚀 Initializing Swap Manager...');
        
        await Promise.all([
            this.ethNearOrchestrator.initialize(),
            this.ethAptosOrchestrator.initialize(),
        ]);
        
        console.log('✅ Swap Manager initialized');
        this.emit('initialized');
    }

    /**
     * Initiate a cross-chain swap
     * @param {Object} swapRequest - Swap request parameters
     * @returns {Object} Swap details
     */
    async initiateSwap(swapRequest) {
        const {
            srcChain,
            dstChain,
            srcToken,
            dstToken,
            srcAmount,
            dstAmount,
            recipient,
            timeoutMinutes = 60,
        } = swapRequest;

        console.log('🔄 Initiating cross-chain swap:', {
            srcChain,
            dstChain,
            srcAmount: srcAmount.toString(),
            dstAmount: dstAmount.toString(),
        });

        // Generate HTLC parameters
        const { secret, hashLock } = HTLCUtils.generateSecret();
        const direction = `${srcChain}_TO_${dstChain}`;
        const timeLocks = HTLCUtils.generateBidirectionalTimelocks(
            direction === 'ETH_TO_NEAR' || direction === 'ETH_TO_APTOS' ? 'ETH_TO_DEST' : 'DEST_TO_ETH',
            timeoutMinutes
        );

        // Create order hash
        const orderHash = HTLCUtils.createOrderHash(
            {
                srcChain,
                dstChain,
                srcToken,
                dstToken,
                srcAmount,
                dstAmount,
                maker: swapRequest.maker || 'unknown',
                recipient,
            },
            hashLock
        );

        // Validate parameters
        const validation = HTLCUtils.validateHTLCParams({
            hashLock,
            timelock: timeLocks.srcChain.timelock,
            srcAmount,
            dstAmount,
            maker: swapRequest.maker || 'unknown',
            recipient,
        });

        if (!validation.valid) {
            throw new Error(`Invalid HTLC parameters: ${validation.errors.join(', ')}`);
        }

        let swapResult;
        
        try {
            // Route to appropriate orchestrator
            if (srcChain === 'ETH' && dstChain === 'NEAR') {
                swapResult = await this.ethNearOrchestrator.initiateETHToNEAR({
                    srcToken,
                    srcAmount,
                    dstToken,
                    dstRecipient: recipient,
                    dstAmount,
                    timelock: HTLCUtils.convertTimestamp(timeLocks.srcChain.timelock, 'ethereum'),
                });
            } else if (srcChain === 'NEAR' && dstChain === 'ETH') {
                swapResult = await this.ethNearOrchestrator.initiateNEARToETH({
                    srcAmount,
                    dstToken,
                    dstRecipient: recipient,
                    dstAmount,
                    timelock: HTLCUtils.convertTimestamp(timeLocks.dstChain.timelock, 'ethereum'),
                });
            } else if (srcChain === 'ETH' && dstChain === 'APTOS') {
                swapResult = await this.ethAptosOrchestrator.initiateETHToAptos({
                    srcToken,
                    srcAmount,
                    dstToken,
                    dstRecipient: recipient,
                    dstAmount,
                    timelock: HTLCUtils.convertTimestamp(timeLocks.srcChain.timelock, 'ethereum'),
                });
            } else if (srcChain === 'APTOS' && dstChain === 'ETH') {
                swapResult = await this.ethAptosOrchestrator.initiateAptosToETH({
                    srcAmount,
                    dstToken,
                    dstRecipient: recipient,
                    dstAmount,
                    timelock: HTLCUtils.convertTimestamp(timeLocks.dstChain.timelock, 'ethereum'),
                });
            } else {
                throw new Error(`Unsupported swap direction: ${srcChain} → ${dstChain}`);
            }

            // Store swap details
            const swapDetails = {
                orderHash,
                direction,
                srcChain,
                dstChain,
                srcToken,
                dstToken,
                srcAmount,
                dstAmount,
                recipient,
                secret,
                hashLock,
                timeLocks,
                ...swapResult,
                status: 'INITIATED',
                createdAt: Date.now(),
            };

            this.activeSwaps.set(orderHash, swapDetails);

            // Create state machine
            const stateMachine = new HTLCStateMachine(orderHash, timeLocks);
            this.setupStateMachine(stateMachine);
            this.stateMachines.set(orderHash, stateMachine);

            // Start monitoring
            this.startSwapMonitoring(orderHash);

            console.log('✅ Swap initiated successfully:', orderHash);
            this.emit('swapInitiated', swapDetails);

            return swapDetails;

        } catch (error) {
            console.error('❌ Failed to initiate swap:', error);
            this.emit('swapError', { orderHash, error: error.message });
            throw error;
        }
    }

    /**
     * Complete a swap by revealing the secret
     * @param {string} orderHash - Order hash
     * @returns {Object} Completion result
     */
    async completeSwap(orderHash) {
        const swapDetails = this.activeSwaps.get(orderHash);
        if (!swapDetails) {
            throw new Error(`Swap not found: ${orderHash}`);
        }

        const stateMachine = this.stateMachines.get(orderHash);
        if (!stateMachine?.canComplete()) {
            throw new Error(`Swap cannot be completed in current state: ${stateMachine?.getCurrentState()}`);
        }

        console.log('🔓 Completing swap:', orderHash);

        try {
            let result;
            
            if (swapDetails.direction.includes('NEAR')) {
                result = await this.ethNearOrchestrator.completeSwap(
                    orderHash,
                    swapDetails.secret,
                    swapDetails.direction
                );
            } else if (swapDetails.direction.includes('APTOS')) {
                result = await this.ethAptosOrchestrator.completeSwap(
                    orderHash,
                    swapDetails.secret,
                    swapDetails.direction
                );
            }

            // Update swap details
            swapDetails.status = 'COMPLETED';
            swapDetails.completedAt = Date.now();
            swapDetails.completionTxs = result;

            // Update state machine
            stateMachine?.processEvent('COMPLETED');

            console.log('✅ Swap completed successfully:', orderHash);
            this.emit('swapCompleted', swapDetails);

            return result;

        } catch (error) {
            console.error('❌ Failed to complete swap:', error);
            this.emit('swapError', { orderHash, error: error.message });
            throw error;
        }
    }

    /**
     * Cancel an expired swap
     * @param {string} orderHash - Order hash
     * @returns {Object} Cancellation result
     */
    async cancelSwap(orderHash) {
        const swapDetails = this.activeSwaps.get(orderHash);
        if (!swapDetails) {
            throw new Error(`Swap not found: ${orderHash}`);
        }

        const stateMachine = this.stateMachines.get(orderHash);
        if (!stateMachine?.canRefund()) {
            throw new Error(`Swap cannot be cancelled in current state: ${stateMachine?.getCurrentState()}`);
        }

        console.log('❌ Cancelling swap:', orderHash);

        try {
            let result;
            
            if (swapDetails.direction.includes('NEAR')) {
                result = await this.ethNearOrchestrator.cancelSwap(
                    orderHash,
                    swapDetails.direction
                );
            } else if (swapDetails.direction.includes('APTOS')) {
                result = await this.ethAptosOrchestrator.cancelSwap(
                    orderHash,
                    swapDetails.direction
                );
            }

            // Update swap details
            swapDetails.status = 'CANCELLED';
            swapDetails.cancelledAt = Date.now();
            swapDetails.cancellationTxs = result;

            // Update state machine
            stateMachine?.processEvent('CANCELLED');

            console.log('✅ Swap cancelled successfully:', orderHash);
            this.emit('swapCancelled', swapDetails);

            return result;

        } catch (error) {
            console.error('❌ Failed to cancel swap:', error);
            this.emit('swapError', { orderHash, error: error.message });
            throw error;
        }
    }

    /**
     * Get swap details
     * @param {string} orderHash - Order hash
     * @returns {Object} Swap details
     */
    getSwapDetails(orderHash) {
        const swapDetails = this.activeSwaps.get(orderHash);
        if (!swapDetails) {
            return null;
        }

        const stateMachine = this.stateMachines.get(orderHash);
        const swapState = HTLCUtils.createSwapState(
            orderHash,
            swapDetails.timeLocks,
            { srcChain: { active: true }, dstChain: { active: true } } // Would get from chains
        );

        return {
            ...swapDetails,
            currentState: stateMachine?.getCurrentState(),
            swapState,
        };
    }

    /**
     * Get all active swaps
     * @returns {Array} Array of active swap details
     */
    getAllActiveSwaps() {
        return Array.from(this.activeSwaps.values())
            .filter(swap => ['INITIATED', 'DEPOSITED'].includes(swap.status))
            .map(swap => this.getSwapDetails(swap.orderHash));
    }

    /**
     * Setup state machine transitions
     * @param {HTLCStateMachine} stateMachine - State machine to setup
     */
    setupStateMachine(stateMachine) {
        // Define state transitions
        stateMachine.addTransition('INITIATED', 'RESOLVER_DEPOSITED', 'RESOLVER_DEPOSIT');
        stateMachine.addTransition('RESOLVER_DEPOSITED', 'SECRET_REVEALED', 'SECRET_REVEAL');
        stateMachine.addTransition('SECRET_REVEALED', 'COMPLETED', 'COMPLETED');
        stateMachine.addTransition('INITIATED', 'EXPIRED', 'TIMEOUT');
        stateMachine.addTransition('RESOLVER_DEPOSITED', 'EXPIRED', 'TIMEOUT');
        stateMachine.addTransition('EXPIRED', 'CANCELLED', 'CANCELLED');
    }

    /**
     * Start monitoring a swap
     * @param {string} orderHash - Order hash to monitor
     */
    startSwapMonitoring(orderHash) {
        const swapDetails = this.activeSwaps.get(orderHash);
        if (!swapDetails) return;

        const orchestrator = swapDetails.direction.includes('NEAR') ? 
            this.ethNearOrchestrator : this.ethAptosOrchestrator;

        const monitor = orchestrator.monitorSwap(
            orderHash,
            swapDetails.timeLocks.phases.expiration,
            (status) => {
                console.log('🎉 Swap completed by monitoring:', orderHash);
                this.emit('swapAutoCompleted', { orderHash, status });
            },
            (status) => {
                console.log('⌛ Swap expired:', orderHash);
                this.emit('swapExpired', { orderHash, status });
                
                // Auto-cancel if possible
                setTimeout(() => {
                    this.cancelSwap(orderHash).catch(err => {
                        console.error('Failed to auto-cancel expired swap:', err);
                    });
                }, 60000); // Wait 1 minute before auto-cancel
            }
        );

        // Store monitor for cleanup
        swapDetails.monitor = monitor;
    }

    /**
     * Stop monitoring a swap
     * @param {string} orderHash - Order hash
     */
    stopSwapMonitoring(orderHash) {
        const swapDetails = this.activeSwaps.get(orderHash);
        if (swapDetails?.monitor) {
            clearInterval(swapDetails.monitor);
            delete swapDetails.monitor;
        }
    }

    /**
     * Cleanup completed or cancelled swaps
     */
    cleanup() {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        for (const [orderHash, swapDetails] of this.activeSwaps.entries()) {
            // Remove swaps completed/cancelled more than 24 hours ago
            if (
                ['COMPLETED', 'CANCELLED'].includes(swapDetails.status) &&
                now - (swapDetails.completedAt || swapDetails.cancelledAt || 0) > oneDay
            ) {
                this.stopSwapMonitoring(orderHash);
                this.activeSwaps.delete(orderHash);
                this.stateMachines.delete(orderHash);
                console.log('🧹 Cleaned up old swap:', orderHash);
            }
        }
    }

    /**
     * Get swap statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        const swaps = Array.from(this.activeSwaps.values());
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        const recent = swaps.filter(s => now - s.createdAt < oneDay);
        
        return {
            total: swaps.length,
            active: swaps.filter(s => ['INITIATED', 'DEPOSITED'].includes(s.status)).length,
            completed: swaps.filter(s => s.status === 'COMPLETED').length,
            cancelled: swaps.filter(s => s.status === 'CANCELLED').length,
            recent24h: recent.length,
            byDirection: {
                ethToNear: swaps.filter(s => s.direction === 'ETH_TO_NEAR').length,
                nearToEth: swaps.filter(s => s.direction === 'NEAR_TO_ETH').length,
                ethToAptos: swaps.filter(s => s.direction === 'ETH_TO_APTOS').length,
                aptosToEth: swaps.filter(s => s.direction === 'APTOS_TO_ETH').length,
            },
        };
    }
}