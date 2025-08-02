import { randomBytes, createHash } from 'crypto';
import { ethers } from 'ethers';

/**
 * Hash Time-Locked Contract (HTLC) utilities for cross-chain swaps
 * Provides secure hashlock and timelock functionality for atomic swaps
 */
export class HTLCUtils {
    
    /**
     * Generate a new secret and corresponding hash lock
     * @returns {Object} Object containing secret and hash lock
     */
    static generateSecret() {
        const secret = randomBytes(32);
        const hashLock = createHash('sha256').update(secret).digest();
        
        return {
            secret: secret.toString('hex'),
            hashLock: hashLock.toString('hex'),
            secretBytes: secret,
            hashLockBytes: hashLock,
        };
    }

    /**
     * Create hash lock from secret
     * @param {string|Buffer} secret - Secret as hex string or Buffer
     * @returns {Object} Hash lock information
     */
    static createHashLock(secret) {
        const secretBuffer = typeof secret === 'string' ? 
            Buffer.from(secret, 'hex') : secret;
        
        const hashLock = createHash('sha256').update(secretBuffer).digest();
        
        return {
            hashLock: hashLock.toString('hex'),
            hashLockBytes: hashLock,
        };
    }

    /**
     * Verify that a secret matches a hash lock
     * @param {string|Buffer} secret - Secret to verify
     * @param {string|Buffer} hashLock - Hash lock to verify against
     * @returns {boolean} True if secret matches hash lock
     */
    static verifySecret(secret, hashLock) {
        const secretBuffer = typeof secret === 'string' ? 
            Buffer.from(secret, 'hex') : secret;
        const hashLockBuffer = typeof hashLock === 'string' ? 
            Buffer.from(hashLock, 'hex') : hashLock;
        
        const computedHash = createHash('sha256').update(secretBuffer).digest();
        return computedHash.equals(hashLockBuffer);
    }

    /**
     * Generate timelock timestamps for different phases
     * @param {number} baseDuration - Base duration in minutes (default: 60)
     * @returns {Object} Timelock timestamps for different phases
     */
    static generateTimelocks(baseDuration = 60) {
        const now = Date.now();
        const baseMs = baseDuration * 60 * 1000; // Convert to milliseconds
        
        return {
            // Phase 1: User initiates swap (immediate)
            initiation: now,
            
            // Phase 2: Resolver has time to deposit on destination chain
            resolverDeposit: now + (baseMs * 0.25), // 15 minutes default
            
            // Phase 3: Secret reveal window (user can complete)
            secretReveal: now + (baseMs * 0.5), // 30 minutes default
            
            // Phase 4: Resolver can complete with revealed secret
            resolverComplete: now + (baseMs * 0.75), // 45 minutes default
            
            // Phase 5: Timelock expires, refunds possible
            expiration: now + baseMs, // 60 minutes default
            
            // Grace period for final cleanup
            gracePeriod: now + (baseMs * 1.25), // 75 minutes default
        };
    }

    /**
     * Generate timelocks for bidirectional swaps with safety margins
     * @param {string} direction - 'ETH_TO_DEST' or 'DEST_TO_ETH'
     * @param {number} baseDuration - Base duration in minutes
     * @returns {Object} Timelock configuration for both chains
     */
    static generateBidirectionalTimelocks(direction, baseDuration = 60) {
        const timeLocks = this.generateTimelocks(baseDuration);
        
        if (direction === 'ETH_TO_DEST') {
            return {
                srcChain: {
                    // Ethereum (source) - longer timelock for safety
                    timelock: timeLocks.expiration + (10 * 60 * 1000), // +10 minutes
                    secretRevealDeadline: timeLocks.secretReveal,
                    refundAvailable: timeLocks.expiration + (10 * 60 * 1000),
                },
                dstChain: {
                    // Destination chain - shorter timelock
                    timelock: timeLocks.expiration,
                    secretRevealDeadline: timeLocks.secretReveal,
                    refundAvailable: timeLocks.expiration,
                },
                phases: timeLocks,
            };
        } else {
            return {
                srcChain: {
                    // Destination chain (source) - shorter timelock
                    timelock: timeLocks.expiration,
                    secretRevealDeadline: timeLocks.secretReveal,
                    refundAvailable: timeLocks.expiration,
                },
                dstChain: {
                    // Ethereum (destination) - longer timelock for safety
                    timelock: timeLocks.expiration + (10 * 60 * 1000), // +10 minutes
                    secretRevealDeadline: timeLocks.secretReveal,
                    refundAvailable: timeLocks.expiration + (10 * 60 * 1000),
                },
                phases: timeLocks,
            };
        }
    }

    /**
     * Check if a timelock has expired
     * @param {number} timelock - Timelock timestamp
     * @returns {boolean} True if expired
     */
    static isTimelockExpired(timelock) {
        return Date.now() > timelock;
    }

    /**
     * Check if we're in the secret reveal window
     * @param {Object} timeLocks - Timelock configuration
     * @returns {boolean} True if in secret reveal window
     */
    static isInSecretRevealWindow(timeLocks) {
        const now = Date.now();
        return now >= timeLocks.secretReveal && now < timeLocks.expiration;
    }

    /**
     * Get time remaining until timelock expires
     * @param {number} timelock - Timelock timestamp
     * @returns {Object} Time remaining object
     */
    static getTimeRemaining(timelock) {
        const now = Date.now();
        const remaining = timelock - now;
        
        if (remaining <= 0) {
            return {
                expired: true,
                totalMs: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
            };
        }
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        return {
            expired: false,
            totalMs: remaining,
            hours,
            minutes,
            seconds,
        };
    }

    /**
     * Create a unique order hash for a swap
     * @param {Object} swapParams - Swap parameters
     * @param {string} hashLock - Hash lock in hex
     * @param {number} nonce - Optional nonce for uniqueness
     * @returns {string} Order hash in hex
     */
    static createOrderHash(swapParams, hashLock, nonce = Date.now()) {
        const orderData = {
            srcChain: swapParams.srcChain,
            dstChain: swapParams.dstChain,
            srcToken: swapParams.srcToken,
            dstToken: swapParams.dstToken,
            srcAmount: swapParams.srcAmount.toString(),
            dstAmount: swapParams.dstAmount.toString(),
            maker: swapParams.maker,
            recipient: swapParams.recipient,
            hashLock,
            nonce,
        };
        
        const dataString = JSON.stringify(orderData);
        const orderHash = createHash('sha256').update(dataString).digest();
        
        return orderHash.toString('hex');
    }

    /**
     * Validate HTLC parameters
     * @param {Object} params - HTLC parameters to validate
     * @returns {Object} Validation result
     */
    static validateHTLCParams(params) {
        const errors = [];
        
        // Validate hash lock
        if (!params.hashLock) {
            errors.push('Hash lock is required');
        } else if (params.hashLock.length !== 64) {
            errors.push('Hash lock must be 32 bytes (64 hex characters)');
        }
        
        // Validate timelock
        if (!params.timelock) {
            errors.push('Timelock is required');
        } else if (params.timelock <= Date.now()) {
            errors.push('Timelock must be in the future');
        } else if (params.timelock > Date.now() + (24 * 60 * 60 * 1000)) {
            errors.push('Timelock cannot be more than 24 hours in the future');
        }
        
        // Validate amounts
        if (!params.srcAmount || params.srcAmount <= 0) {
            errors.push('Source amount must be greater than 0');
        }
        
        if (!params.dstAmount || params.dstAmount <= 0) {
            errors.push('Destination amount must be greater than 0');
        }
        
        // Validate addresses/recipients
        if (!params.maker) {
            errors.push('Maker address is required');
        }
        
        if (!params.recipient) {
            errors.push('Recipient address is required');
        }
        
        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Convert timelock between different chain formats
     * @param {number} timestamp - Timestamp in milliseconds
     * @param {string} targetFormat - 'ethereum', 'near', 'aptos'
     * @returns {number} Converted timestamp
     */
    static convertTimestamp(timestamp, targetFormat) {
        switch (targetFormat) {
            case 'ethereum':
                // Ethereum uses seconds
                return Math.floor(timestamp / 1000);
            
            case 'near':
                // NEAR uses nanoseconds
                return timestamp * 1000000;
            
            case 'aptos':
                // Aptos uses seconds
                return Math.floor(timestamp / 1000);
            
            default:
                throw new Error(`Unsupported timestamp format: ${targetFormat}`);
        }
    }

    /**
     * Get swap phase based on current time and timelocks
     * @param {Object} timeLocks - Timelock configuration
     * @returns {string} Current phase
     */
    static getCurrentPhase(timeLocks) {
        const now = Date.now();
        
        if (now < timeLocks.resolverDeposit) {
            return 'INITIATION';
        } else if (now < timeLocks.secretReveal) {
            return 'RESOLVER_DEPOSIT';
        } else if (now < timeLocks.resolverComplete) {
            return 'SECRET_REVEAL';
        } else if (now < timeLocks.expiration) {
            return 'RESOLVER_COMPLETE';
        } else if (now < timeLocks.gracePeriod) {
            return 'EXPIRED';
        } else {
            return 'GRACE_PERIOD';
        }
    }

    /**
     * Create a compact swap state for monitoring
     * @param {string} orderHash - Order hash
     * @param {Object} timeLocks - Timelock configuration
     * @param {Object} status - Current status from chains
     * @returns {Object} Compact swap state
     */
    static createSwapState(orderHash, timeLocks, status) {
        const phase = this.getCurrentPhase(timeLocks);
        const timeRemaining = this.getTimeRemaining(timeLocks.expiration);
        
        return {
            orderHash,
            phase,
            timeRemaining,
            expired: timeRemaining.expired,
            canComplete: phase === 'SECRET_REVEAL' || phase === 'RESOLVER_COMPLETE',
            canRefund: phase === 'EXPIRED' || phase === 'GRACE_PERIOD',
            srcChainActive: status?.srcChain?.active || false,
            dstChainActive: status?.dstChain?.active || false,
            bothChainsActive: (status?.srcChain?.active && status?.dstChain?.active) || false,
        };
    }
}

/**
 * HTLC State Machine for managing swap states
 */
export class HTLCStateMachine {
    constructor(orderHash, timeLocks) {
        this.orderHash = orderHash;
        this.timeLocks = timeLocks;
        this.state = 'INITIATED';
        this.transitions = [];
    }

    /**
     * Add a state transition
     * @param {string} fromState - Source state
     * @param {string} toState - Target state
     * @param {string} event - Event that triggers transition
     */
    addTransition(fromState, toState, event) {
        this.transitions.push({ fromState, toState, event });
    }

    /**
     * Process an event and potentially transition state
     * @param {string} event - Event to process
     * @returns {boolean} True if state changed
     */
    processEvent(event) {
        const transition = this.transitions.find(
            t => t.fromState === this.state && t.event === event
        );
        
        if (transition) {
            const oldState = this.state;
            this.state = transition.toState;
            console.log(`🔄 State transition: ${oldState} → ${this.state} (${event})`);
            return true;
        }
        
        return false;
    }

    /**
     * Get current state
     * @returns {string} Current state
     */
    getCurrentState() {
        return this.state;
    }

    /**
     * Check if swap can be completed
     * @returns {boolean} True if can complete
     */
    canComplete() {
        return ['RESOLVER_DEPOSITED', 'SECRET_REVEALED'].includes(this.state);
    }

    /**
     * Check if swap can be refunded
     * @returns {boolean} True if can refund
     */
    canRefund() {
        return this.state === 'EXPIRED' || HTLCUtils.isTimelockExpired(this.timeLocks.expiration);
    }
}