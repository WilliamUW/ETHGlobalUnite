import { ethers } from 'ethers';
import { AptosClient, AptosAccount, HexString, BCS } from 'aptos';
import { randomBytes, createHash } from 'crypto';

/**
 * ETH<>Aptos Cross-Chain Swap Orchestrator
 * Handles the complete flow of cross-chain swaps between Ethereum and Aptos
 */
export class ETHAptosOrchestrator {
    constructor(config) {
        this.config = config;
        this.ethProvider = null;
        this.ethSigner = null;
        this.aptosClient = null;
        this.aptosAccount = null;
        this.crossChainResolver = null;
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

        // Initialize Aptos connection
        this.aptosClient = new AptosClient(this.config.aptos.nodeUrl);
        
        // Initialize Aptos account from private key
        const privateKeyBytes = HexString.ensure(this.config.aptos.privateKey).toUint8Array();
        this.aptosAccount = new AptosAccount(privateKeyBytes);
    }

    /**
     * Initiate ETH → Aptos swap
     * @param {Object} swapParams - Swap parameters
     * @returns {Object} Swap details including secret and order hash
     */
    async initiateETHToAptos(swapParams) {
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

        console.log('🚀 Initiating ETH → Aptos swap...');
        console.log('Order hash:', orderHash.toString('hex'));
        console.log('Hash lock:', hashLock.toString('hex'));

        try {
            // Step 1: Initiate swap on Ethereum side
            const ethTx = await this.crossChainResolver.initiateSwap(
                orderHash,
                srcToken,
                srcAmount,
                'APTOS',
                dstToken,
                dstRecipient,
                dstAmount,
                hashLock,
                timelock,
                srcToken === ethers.ZeroAddress ? { value: srcAmount } : {}
            );

            console.log('✅ Ethereum swap initiated, tx:', ethTx.hash);
            await ethTx.wait();

            // Step 2: Create HTLC on Aptos side (resolver deposits funds)
            const payload = {
                type: "entry_function_payload",
                function: `${this.config.aptos.escrowAddress}::cross_chain_escrow::create_htlc`,
                type_arguments: [],
                arguments: [
                    this.config.aptos.escrowAddress,
                    Array.from(orderHash),
                    await this.ethSigner.getAddress(),
                    'ETHEREUM',
                    srcToken,
                    srcAmount.toString(),
                    HexString.ensure(dstRecipient).hex(),
                    dstToken,
                    Array.from(hashLock),
                    Math.floor(timelock / 1000), // Convert to seconds
                    dstAmount.toString(),
                ]
            };

            const aptosTransaction = await this.aptosClient.generateTransaction(
                this.aptosAccount.address(),
                payload
            );

            const signedTxn = await this.aptosClient.signTransaction(
                this.aptosAccount,
                aptosTransaction
            );

            const aptosTx = await this.aptosClient.submitTransaction(signedTxn);
            await this.aptosClient.waitForTransaction(aptosTx.hash);

            console.log('✅ Aptos HTLC created, tx:', aptosTx.hash);

            return {
                orderHash: orderHash.toString('hex'),
                secret: secret.toString('hex'),
                hashLock: hashLock.toString('hex'),
                ethTxHash: ethTx.hash,
                aptosTxHash: aptosTx.hash,
                timelock,
                srcAmount,
                dstAmount,
            };

        } catch (error) {
            console.error('❌ Error initiating ETH → Aptos swap:', error);
            throw error;
        }
    }

    /**
     * Initiate Aptos → ETH swap
     * @param {Object} swapParams - Swap parameters
     * @returns {Object} Swap details including secret and order hash
     */
    async initiateAptosToETH(swapParams) {
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

        console.log('🚀 Initiating Aptos → ETH swap...');
        console.log('Order hash:', orderHash.toString('hex'));
        console.log('Hash lock:', hashLock.toString('hex'));

        try {
            // Step 1: Create HTLC on Aptos side (user deposits funds)
            const payload = {
                type: "entry_function_payload",
                function: `${this.config.aptos.escrowAddress}::cross_chain_escrow::create_htlc`,
                type_arguments: [],
                arguments: [
                    this.config.aptos.escrowAddress,
                    Array.from(orderHash),
                    this.aptosAccount.address().hex(),
                    'APTOS',
                    'APT',
                    srcAmount.toString(),
                    dstRecipient,
                    dstToken,
                    Array.from(hashLock),
                    Math.floor(timelock / 1000), // Convert to seconds
                    srcAmount.toString(),
                ]
            };

            const aptosTransaction = await this.aptosClient.generateTransaction(
                this.aptosAccount.address(),
                payload
            );

            const signedTxn = await this.aptosClient.signTransaction(
                this.aptosAccount,
                aptosTransaction
            );

            const aptosTx = await this.aptosClient.submitTransaction(signedTxn);
            await this.aptosClient.waitForTransaction(aptosTx.hash);

            console.log('✅ Aptos HTLC created, tx:', aptosTx.hash);

            // Step 2: Initiate swap on Ethereum side (resolver deposits funds)
            const ethTx = await this.crossChainResolver.initiateSwap(
                orderHash,
                dstToken,
                dstAmount,
                'APTOS',
                'APT',
                this.aptosAccount.address().hex(),
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
                aptosTxHash: aptosTx.hash,
                ethTxHash: ethTx.hash,
                timelock,
                srcAmount,
                dstAmount,
            };

        } catch (error) {
            console.error('❌ Error initiating Aptos → ETH swap:', error);
            throw error;
        }
    }

    /**
     * Complete swap by revealing secret on both chains
     * @param {string} orderHash - Order hash in hex
     * @param {string} secret - Secret in hex
     * @param {string} direction - 'ETH_TO_APTOS' or 'APTOS_TO_ETH'
     */
    async completeSwap(orderHash, secret, direction) {
        const orderHashBytes = Buffer.from(orderHash, 'hex');
        const secretBytes = Buffer.from(secret, 'hex');

        console.log('🔓 Completing swap...');
        
        try {
            if (direction === 'ETH_TO_APTOS') {
                // Complete on Aptos first (user gets funds)
                const payload = {
                    type: "entry_function_payload",
                    function: `${this.config.aptos.escrowAddress}::cross_chain_escrow::complete_htlc`,
                    type_arguments: [],
                    arguments: [
                        this.config.aptos.escrowAddress,
                        Array.from(orderHashBytes),
                        Array.from(secretBytes),
                    ]
                };

                const aptosTransaction = await this.aptosClient.generateTransaction(
                    this.aptosAccount.address(),
                    payload
                );

                const signedTxn = await this.aptosClient.signTransaction(
                    this.aptosAccount,
                    aptosTransaction
                );

                const aptosTx = await this.aptosClient.submitTransaction(signedTxn);
                await this.aptosClient.waitForTransaction(aptosTx.hash);

                console.log('✅ Aptos swap completed, tx:', aptosTx.hash);

                // Then complete on Ethereum (resolver gets funds)
                const ethTx = await this.crossChainResolver.completeSwap(
                    orderHashBytes,
                    secretBytes,
                    await this.ethSigner.getAddress()
                );

                console.log('✅ Ethereum swap completed, tx:', ethTx.hash);
                await ethTx.wait();

                return {
                    aptosTxHash: aptosTx.hash,
                    ethTxHash: ethTx.hash,
                };

            } else { // APTOS_TO_ETH
                // Complete on Ethereum first (user gets funds)
                const ethTx = await this.crossChainResolver.completeSwap(
                    orderHashBytes,
                    secretBytes,
                    await this.ethSigner.getAddress()
                );

                console.log('✅ Ethereum swap completed, tx:', ethTx.hash);
                await ethTx.wait();

                // Then complete on Aptos (resolver gets funds)
                const payload = {
                    type: "entry_function_payload",
                    function: `${this.config.aptos.escrowAddress}::cross_chain_escrow::complete_htlc`,
                    type_arguments: [],
                    arguments: [
                        this.config.aptos.escrowAddress,
                        Array.from(orderHashBytes),
                        Array.from(secretBytes),
                    ]
                };

                const aptosTransaction = await this.aptosClient.generateTransaction(
                    this.aptosAccount.address(),
                    payload
                );

                const signedTxn = await this.aptosClient.signTransaction(
                    this.aptosAccount,
                    aptosTransaction
                );

                const aptosTx = await this.aptosClient.submitTransaction(signedTxn);
                await this.aptosClient.waitForTransaction(aptosTx.hash);

                console.log('✅ Aptos swap completed, tx:', aptosTx.hash);

                return {
                    ethTxHash: ethTx.hash,
                    aptosTxHash: aptosTx.hash,
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
     * @param {string} direction - 'ETH_TO_APTOS' or 'APTOS_TO_ETH'
     */
    async cancelSwap(orderHash, direction) {
        const orderHashBytes = Buffer.from(orderHash, 'hex');

        console.log('❌ Cancelling expired swap...');
        
        try {
            // Cancel on Ethereum
            const ethTx = await this.crossChainResolver.cancelSwap(orderHashBytes);
            console.log('✅ Ethereum swap cancelled, tx:', ethTx.hash);
            await ethTx.wait();

            // Cancel on Aptos
            const payload = {
                type: "entry_function_payload",
                function: `${this.config.aptos.escrowAddress}::cross_chain_escrow::refund_htlc`,
                type_arguments: [],
                arguments: [
                    this.config.aptos.escrowAddress,
                    Array.from(orderHashBytes),
                ]
            };

            const aptosTransaction = await this.aptosClient.generateTransaction(
                this.aptosAccount.address(),
                payload
            );

            const signedTxn = await this.aptosClient.signTransaction(
                this.aptosAccount,
                aptosTransaction
            );

            const aptosTx = await this.aptosClient.submitTransaction(signedTxn);
            await this.aptosClient.waitForTransaction(aptosTx.hash);

            console.log('✅ Aptos swap cancelled, tx:', aptosTx.hash);

            return {
                ethTxHash: ethTx.hash,
                aptosTxHash: aptosTx.hash,
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

            // Get status from Aptos
            const aptosOrder = await this.aptosClient.view({
                function: `${this.config.aptos.escrowAddress}::cross_chain_escrow::get_swap_order`,
                type_arguments: [],
                arguments: [
                    this.config.aptos.escrowAddress,
                    Array.from(orderHashBytes),
                ]
            });

            const aptosActive = await this.aptosClient.view({
                function: `${this.config.aptos.escrowAddress}::cross_chain_escrow::is_htlc_active`,
                type_arguments: [],
                arguments: [
                    this.config.aptos.escrowAddress,
                    Array.from(orderHashBytes),
                ]
            });

            return {
                ethereum: {
                    order: ethOrder,
                    active: ethActive,
                },
                aptos: {
                    order: aptosOrder,
                    active: aptosActive[0], // Aptos view functions return arrays
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
                if (!status.ethereum.active || !status.aptos.active) {
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

    /**
     * Verify hash lock matches secret (using Aptos client)
     * @param {string} secret - Secret in hex
     * @param {string} hashLock - Hash lock in hex
     * @returns {boolean} True if valid
     */
    async verifySecret(secret, hashLock) {
        const secretBytes = Buffer.from(secret, 'hex');
        const hashLockBytes = Buffer.from(hashLock, 'hex');

        try {
            const result = await this.aptosClient.view({
                function: `${this.config.aptos.escrowAddress}::cross_chain_escrow::verify_secret`,
                type_arguments: [],
                arguments: [
                    Array.from(secretBytes),
                    Array.from(hashLockBytes),
                ]
            });

            return result[0]; // Aptos view functions return arrays

        } catch (error) {
            console.error('❌ Error verifying secret:', error);
            return false;
        }
    }

    /**
     * Get Aptos account balance
     * @returns {string} Account balance in octas
     */
    async getAptosBalance() {
        try {
            const resources = await this.aptosClient.getAccountResources(
                this.aptosAccount.address()
            );
            
            const coinStore = resources.find(
                r => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
            );
            
            return coinStore ? coinStore.data.coin.value : '0';

        } catch (error) {
            console.error('❌ Error getting Aptos balance:', error);
            return '0';
        }
    }
}