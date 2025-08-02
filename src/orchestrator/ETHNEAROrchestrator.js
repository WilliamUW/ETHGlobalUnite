import { ethers } from 'ethers';
import { connect, keyStores, WalletConnection } from 'near-api-js';
import { randomBytes, createHash } from 'crypto';

/**
 * ETH<>NEAR Cross-Chain Swap Orchestrator
 * Handles the complete flow of cross-chain swaps between Ethereum and NEAR
 */
export class ETHNEAROrchestrator {
    constructor(config) {
        this.config = config;
        this.ethProvider = null;
        this.ethSigner = null;
        this.nearConnection = null;
        this.nearAccount = null;
        this.crossChainResolver = null;
        this.nearEscrow = null;
    }

    /**
     * Initialize connections to both chains
     */
    async initialize() {
        // Initialize Ethereum connection
        this.ethProvider = new ethers.JsonRpcProvider(this.config.eth.rpcUrl);
        this.ethSigner = new ethers.Wallet(this.config.eth.privateKey, this.ethProvider);
        
        // Initialize CrossChainResolver contract
        this.crossChainResolver = new ethers.Contract(
            this.config.eth.crossChainResolverAddress,
            this.config.eth.crossChainResolverABI,
            this.ethSigner
        );

        // Initialize NEAR connection
        const keyStore = new keyStores.InMemoryKeyStore();
        const nearConfig = {
            networkId: this.config.near.networkId,
            keyStore,
            nodeUrl: this.config.near.nodeUrl,
            walletUrl: this.config.near.walletUrl,
            helperUrl: this.config.near.helperUrl,
        };

        this.nearConnection = await connect(nearConfig);
        this.nearAccount = await this.nearConnection.account(this.config.near.accountId);
    }

    /**
     * Initiate ETH → NEAR swap
     * @param {Object} swapParams - Swap parameters
     * @returns {Object} Swap details including secret and order hash
     */
    async initiateETHToNEAR(swapParams) {
        const {
            srcToken,
            srcAmount,
            dstToken,
            dstRecipient,
            dstAmount,
            timelock
        } = swapParams;

        // Generate secret and hash lock
        const secret = randomBytes(32);
        const hashLock = createHash('sha256').update(secret).digest();
        const orderHash = this.generateOrderHash(swapParams, hashLock);

        console.log('🚀 Initiating ETH → NEAR swap...');
        console.log('Order hash:', orderHash.toString('hex'));
        console.log('Hash lock:', hashLock.toString('hex'));

        try {
            // Step 1: Initiate swap on Ethereum side
            const ethTx = await this.crossChainResolver.initiateSwap(
                orderHash,
                srcToken,
                srcAmount,
                'NEAR',
                dstToken,
                dstRecipient,
                dstAmount,
                hashLock,
                timelock,
                srcToken === ethers.ZeroAddress ? { value: srcAmount } : {}
            );

            console.log('✅ Ethereum swap initiated, tx:', ethTx.hash);
            await ethTx.wait();

            // Step 2: Create HTLC on NEAR side (resolver deposits funds)
            const nearResult = await this.nearAccount.functionCall({
                contractId: this.config.near.escrowContractId,
                methodName: 'create_htlc',
                args: {
                    order_hash: Array.from(orderHash),
                    src_maker: await this.ethSigner.getAddress(),
                    src_chain: 'ETHEREUM',
                    src_token: srcToken,
                    src_amount: srcAmount.toString(),
                    dst_recipient: dstRecipient,
                    dst_token: dstToken,
                    hash_lock: Array.from(hashLock),
                    timelock: Math.floor(timelock / 1000000), // Convert to nanoseconds
                },
                gas: '100000000000000', // 100 TGas
                attachedDeposit: dstAmount.toString(),
            });

            console.log('✅ NEAR HTLC created, tx:', nearResult.transaction.hash);

            return {
                orderHash: orderHash.toString('hex'),
                secret: secret.toString('hex'),
                hashLock: hashLock.toString('hex'),
                ethTxHash: ethTx.hash,
                nearTxHash: nearResult.transaction.hash,
                timelock,
                srcAmount,
                dstAmount,
            };

        } catch (error) {
            console.error('❌ Error initiating ETH → NEAR swap:', error);
            throw error;
        }
    }

    /**
     * Initiate NEAR → ETH swap
     * @param {Object} swapParams - Swap parameters
     * @returns {Object} Swap details including secret and order hash
     */
    async initiateNEARToETH(swapParams) {
        const {
            srcAmount,
            dstToken,
            dstRecipient,
            dstAmount,
            timelock
        } = swapParams;

        // Generate secret and hash lock
        const secret = randomBytes(32);
        const hashLock = createHash('sha256').update(secret).digest();
        const orderHash = this.generateOrderHash(swapParams, hashLock);

        console.log('🚀 Initiating NEAR → ETH swap...');
        console.log('Order hash:', orderHash.toString('hex'));
        console.log('Hash lock:', hashLock.toString('hex'));

        try {
            // Step 1: Create HTLC on NEAR side (user deposits funds)
            const nearResult = await this.nearAccount.functionCall({
                contractId: this.config.near.escrowContractId,
                methodName: 'create_htlc',
                args: {
                    order_hash: Array.from(orderHash),
                    src_maker: this.config.near.accountId,
                    src_chain: 'NEAR',
                    src_token: 'NEAR',
                    src_amount: srcAmount.toString(),
                    dst_recipient: dstRecipient,
                    dst_token: dstToken,
                    hash_lock: Array.from(hashLock),
                    timelock: Math.floor(timelock / 1000000), // Convert to nanoseconds
                },
                gas: '100000000000000', // 100 TGas
                attachedDeposit: srcAmount.toString(),
            });

            console.log('✅ NEAR HTLC created, tx:', nearResult.transaction.hash);

            // Step 2: Initiate swap on Ethereum side (resolver deposits funds)
            const ethTx = await this.crossChainResolver.initiateSwap(
                orderHash,
                dstToken,
                dstAmount,
                'NEAR',
                'NEAR',
                this.config.near.accountId,
                srcAmount,
                hashLock,
                timelock,
                dstToken === ethers.ZeroAddress ? { value: dstAmount } : {}
            );

            console.log('✅ Ethereum swap initiated, tx:', ethTx.hash);
            await ethTx.wait();

            return {
                orderHash: orderHash.toString('hex'),
                secret: secret.toString('hex'),
                hashLock: hashLock.toString('hex'),
                nearTxHash: nearResult.transaction.hash,
                ethTxHash: ethTx.hash,
                timelock,
                srcAmount,
                dstAmount,
            };

        } catch (error) {
            console.error('❌ Error initiating NEAR → ETH swap:', error);
            throw error;
        }
    }

    /**
     * Complete swap by revealing secret on both chains
     * @param {string} orderHash - Order hash in hex
     * @param {string} secret - Secret in hex
     * @param {string} direction - 'ETH_TO_NEAR' or 'NEAR_TO_ETH'
     */
    async completeSwap(orderHash, secret, direction) {
        const orderHashBytes = Buffer.from(orderHash, 'hex');
        const secretBytes = Buffer.from(secret, 'hex');

        console.log('🔓 Completing swap...');
        
        try {
            if (direction === 'ETH_TO_NEAR') {
                // Complete on NEAR first (user gets funds)
                const nearResult = await this.nearAccount.functionCall({
                    contractId: this.config.near.escrowContractId,
                    methodName: 'complete_htlc',
                    args: {
                        order_hash: Array.from(orderHashBytes),
                        secret: Array.from(secretBytes),
                    },
                    gas: '100000000000000', // 100 TGas
                });

                console.log('✅ NEAR swap completed, tx:', nearResult.transaction.hash);

                // Then complete on Ethereum (resolver gets funds)
                const ethTx = await this.crossChainResolver.completeSwap(
                    orderHashBytes,
                    secretBytes,
                    await this.ethSigner.getAddress()
                );

                console.log('✅ Ethereum swap completed, tx:', ethTx.hash);
                await ethTx.wait();

                return {
                    nearTxHash: nearResult.transaction.hash,
                    ethTxHash: ethTx.hash,
                };

            } else { // NEAR_TO_ETH
                // Complete on Ethereum first (user gets funds)
                const ethTx = await this.crossChainResolver.completeSwap(
                    orderHashBytes,
                    secretBytes,
                    await this.ethSigner.getAddress()
                );

                console.log('✅ Ethereum swap completed, tx:', ethTx.hash);
                await ethTx.wait();

                // Then complete on NEAR (resolver gets funds)
                const nearResult = await this.nearAccount.functionCall({
                    contractId: this.config.near.escrowContractId,
                    methodName: 'complete_htlc',
                    args: {
                        order_hash: Array.from(orderHashBytes),
                        secret: Array.from(secretBytes),
                    },
                    gas: '100000000000000', // 100 TGas
                });

                console.log('✅ NEAR swap completed, tx:', nearResult.transaction.hash);

                return {
                    ethTxHash: ethTx.hash,
                    nearTxHash: nearResult.transaction.hash,
                };
            }

        } catch (error) {
            console.error('❌ Error completing swap:', error);
            throw error;
        }
    }

    /**
     * Cancel expired swap on both chains
     * @param {string} orderHash - Order hash in hex
     * @param {string} direction - 'ETH_TO_NEAR' or 'NEAR_TO_ETH'
     */
    async cancelSwap(orderHash, direction) {
        const orderHashBytes = Buffer.from(orderHash, 'hex');

        console.log('❌ Cancelling expired swap...');
        
        try {
            // Cancel on both chains
            const ethTx = await this.crossChainResolver.cancelSwap(orderHashBytes);
            console.log('✅ Ethereum swap cancelled, tx:', ethTx.hash);
            await ethTx.wait();

            const nearResult = await this.nearAccount.functionCall({
                contractId: this.config.near.escrowContractId,
                methodName: 'refund_htlc',
                args: {
                    order_hash: Array.from(orderHashBytes),
                },
                gas: '100000000000000', // 100 TGas
            });

            console.log('✅ NEAR swap cancelled, tx:', nearResult.transaction.hash);

            return {
                ethTxHash: ethTx.hash,
                nearTxHash: nearResult.transaction.hash,
            };

        } catch (error) {
            console.error('❌ Error cancelling swap:', error);
            throw error;
        }
    }

    /**
     * Get swap status from both chains
     * @param {string} orderHash - Order hash in hex
     * @returns {Object} Swap status from both chains
     */
    async getSwapStatus(orderHash) {
        const orderHashBytes = Buffer.from(orderHash, 'hex');

        try {
            // Get status from Ethereum
            const ethOrder = await this.crossChainResolver.getSwapOrder(orderHashBytes);
            const ethActive = await this.crossChainResolver.isSwapActive(orderHashBytes);

            // Get status from NEAR
            const nearOrder = await this.nearAccount.viewFunction({
                contractId: this.config.near.escrowContractId,
                methodName: 'get_swap_order',
                args: {
                    order_hash: Array.from(orderHashBytes),
                },
            });

            const nearActive = await this.nearAccount.viewFunction({
                contractId: this.config.near.escrowContractId,
                methodName: 'is_htlc_active',
                args: {
                    order_hash: Array.from(orderHashBytes),
                },
            });

            return {
                ethereum: {
                    order: ethOrder,
                    active: ethActive,
                },
                near: {
                    order: nearOrder,
                    active: nearActive,
                },
            };

        } catch (error) {
            console.error('❌ Error getting swap status:', error);
            throw error;
        }
    }

    /**
     * Generate deterministic order hash
     * @param {Object} swapParams - Swap parameters
     * @param {Buffer} hashLock - Hash lock
     * @returns {Buffer} Order hash
     */
    generateOrderHash(swapParams, hashLock) {
        const data = JSON.stringify({
            ...swapParams,
            hashLock: hashLock.toString('hex'),
            timestamp: Date.now(),
        });
        return createHash('sha256').update(data).digest();
    }

    /**
     * Monitor swap for completion or expiration
     * @param {string} orderHash - Order hash in hex
     * @param {number} timelock - Timelock timestamp
     * @param {function} onComplete - Callback for completion
     * @param {function} onExpire - Callback for expiration
     */
    async monitorSwap(orderHash, timelock, onComplete, onExpire) {
        const checkInterval = 30000; // 30 seconds
        const monitor = setInterval(async () => {
            try {
                const status = await this.getSwapStatus(orderHash);
                
                // Check if completed on either chain
                if (!status.ethereum.active || !status.near.active) {
                    clearInterval(monitor);
                    onComplete(status);
                    return;
                }

                // Check if expired
                if (Date.now() > timelock) {
                    clearInterval(monitor);
                    onExpire(status);
                    return;
                }

            } catch (error) {
                console.error('❌ Error monitoring swap:', error);
            }
        }, checkInterval);

        return monitor;
    }
}