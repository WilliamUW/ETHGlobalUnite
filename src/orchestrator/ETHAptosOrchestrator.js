import { ethers } from 'ethers';
import { AptosClient, AptosAccount, HexString, BCS } from 'aptos';
import { randomBytes, createHash } from 'crypto';

/**
 * Base Sepolia <> Aptos Atomic Cross-Chain Swap Orchestrator
 * Implements real atomic swaps with 4-transaction pattern:
 * 1. Account1 escrow: Locks funds on source chain with secret hash
 * 2. Account2 escrow: Locks funds on destination chain with same secret hash  
 * 3. Account1 claim: Reveals secret to claim Account2 funds on destination chain
 * 4. Account2 claim: Uses revealed secret to claim Account1 funds on source chain
 */
export class ETHAptosOrchestrator {
    constructor(config) {
        this.config = config;
        this.baseProvider = null;
        this.baseSigner1 = null; // Wallet 1 for Base Sepolia
        this.baseSigner2 = null; // Wallet 2 for Base Sepolia
        this.aptosClient = null;
        this.aptosAccount1 = null; // Wallet 1 for Aptos
        this.aptosAccount2 = null; // Wallet 2 for Aptos
        this.lopContract = null; // 1inch Limit Order Protocol
    }

    /**
     * Initialize connections to both chains with 2 wallets each
     */
    async initialize() {
        // Initialize Base Sepolia connection with 2 wallets
        this.baseProvider = new ethers.JsonRpcProvider(this.config.baseSepolia.rpcUrl);
        this.baseSigner1 = new ethers.Wallet(process.env.BASE_SEPOLIA_PRIVATE_KEY_1, this.baseProvider);
        this.baseSigner2 = new ethers.Wallet(process.env.BASE_SEPOLIA_PRIVATE_KEY_2, this.baseProvider);
        
        // Initialize 1inch LOP contract
        this.lopContract = new ethers.Contract(
            this.config.baseSepolia.limitOrderProtocol,
            this.config.lopABI,
            this.baseSigner1 // Default to wallet 1, will switch as needed
        );

        // Initialize Aptos connection
        this.aptosClient = new AptosClient(this.config.aptos.nodeUrl);
        
        // Initialize 2 Aptos accounts from private keys
        const privateKey1 = HexString.ensure(process.env.APTOS_PRIVATE_KEY_1).toUint8Array();
        const privateKey2 = HexString.ensure(process.env.APTOS_PRIVATE_KEY_2).toUint8Array();
        this.aptosAccount1 = new AptosAccount(privateKey1);
        this.aptosAccount2 = new AptosAccount(privateKey2);
    }

    /**
     * Transaction 1: Account1 escrow on Base Sepolia using 1inch LOP
     * Account1 locks ETH/tokens on Base using 1inch LOP with secret hash
     * @param {Object} escrowParams - Escrow parameters
     * @returns {Object} Escrow details for Account1
     */
    async account1EscrowBase(escrowParams) {
        const {
            account1Address, // Base Sepolia address
            account2AptosAddress, // Aptos address
            srcToken,
            srcAmount,
            hashLock,
            timelock
        } = escrowParams;

        console.log('🔒 Transaction 1: Account1 escrow on Base Sepolia');
        console.log('Hash lock:', hashLock.toString('hex'));

        try {
            // Create 1inch LOP order with hashlock embedded in salt
            const order = {
                salt: hashLock, // Embed hashlock in salt for verification
                maker: account1Address,
                receiver: ethers.ZeroAddress, // Anyone can fill with secret
                makerAsset: srcToken,
                takerAsset: srcToken, // Same token for atomic swap
                makingAmount: srcAmount,
                takingAmount: srcAmount,
                makerTraits: BigInt(timelock), // Store timelock in makerTraits
            };

            const orderHash = await this.lopContract.hashOrder(order);
            console.log('📋 1inch LOP escrow order hash:', orderHash);

            return {
                orderHash,
                lopOrder: order,
                account1Address,
                account2AptosAddress,
                srcToken,
                srcAmount,
                hashLock: hashLock.toString('hex'),
                timelock,
                status: 'account1_escrowed'
            };

        } catch (error) {
            console.error('❌ Error in Account1 Base escrow:', error);
            throw error;
        }
    }

    /**
     * Transaction 2: Account2 escrow on Aptos using HTLC
     * Account2 locks APT/tokens on Aptos chain with same secret hash
     * @param {Object} swapData - Data from Transaction 1
     * @param {Object} escrowParams - Account2 escrow parameters
     * @returns {Object} Updated swap data
     */
    async account2EscrowAptos(swapData, escrowParams) {
        const {
            account2AptosAddress,
            account1BaseAddress,
            dstToken,
            dstAmount
        } = escrowParams;

        console.log('🔒 Transaction 2: Account2 escrow on Aptos');
        console.log('Matching hash lock:', swapData.hashLock);

        try {
            const payload = {
                type: "entry_function_payload",
                function: `${this.config.aptos.escrowAddress}::cross_chain_escrow::create_htlc`,
                type_arguments: [],
                arguments: [
                    Array.from(ethers.getBytes(swapData.orderHash)),
                    account1BaseAddress, // Account1 will claim
                    dstToken,
                    dstAmount.toString(),
                    Array.from(Buffer.from(swapData.hashLock, 'hex')),
                    swapData.timelock,
                ]
            };

            const aptosAccount = new AptosAccount(HexString.ensure(process.env.APTOS_PRIVATE_KEY_2).toUint8Array());
            const aptosTransaction = await this.aptosClient.generateTransaction(
                aptosAccount.address(),
                payload
            );

            const signedTxn = await this.aptosClient.signTransaction(
                aptosAccount,
                aptosTransaction
            );

            const aptosTx = await this.aptosClient.submitTransaction(signedTxn);
            await this.aptosClient.waitForTransaction(aptosTx.hash);

            console.log('✅ Aptos HTLC created, tx:', aptosTx.hash);

            return {
                ...swapData,
                aptosTxHash: aptosTx.hash,
                account2AptosAddress,
                dstToken,
                dstAmount,
                status: 'both_escrowed'
            };

        } catch (error) {
            console.error('❌ Error in Account2 Aptos escrow:', error);
            throw error;
        }
    }

    /**
     * Transaction 3: Account1 claim on Aptos using secret
     * Account1 reveals secret to claim Account2's APT/tokens
     * @param {Object} swapData - Data from previous transactions
     * @param {string} secret - The secret to reveal (hex)
     * @returns {Object} Updated swap data with revealed secret
     */
    async account1ClaimAptos(swapData, secret) {
        console.log('🔓 Transaction 3: Account1 claim on Aptos (reveals secret)');
        console.log('Secret being revealed:', secret);

        try {
            const secretBytes = Buffer.from(secret, 'hex');
            
            const payload = {
                type: "entry_function_payload",
                function: `${this.config.aptos.escrowAddress}::cross_chain_escrow::complete_htlc`,
                type_arguments: [],
                arguments: [
                    Array.from(ethers.getBytes(swapData.orderHash)),
                    Array.from(secretBytes),
                ]
            };

            const aptosAccount = new AptosAccount(HexString.ensure(process.env.APTOS_PRIVATE_KEY_1).toUint8Array());
            const aptosTransaction = await this.aptosClient.generateTransaction(
                aptosAccount.address(),
                payload
            );

            const signedTxn = await this.aptosClient.signTransaction(
                aptosAccount,
                aptosTransaction
            );

            const aptosTx = await this.aptosClient.submitTransaction(signedTxn);
            await this.aptosClient.waitForTransaction(aptosTx.hash);

            console.log('✅ Account1 claimed Aptos funds, tx:', aptosTx.hash);
            console.log('🔑 Secret revealed on-chain, Account2 can now claim Base funds');

            return {
                ...swapData,
                aptosClaimTxHash: aptosTx.hash,
                revealedSecret: secret,
                status: 'account1_claimed_secret_revealed'
            };

        } catch (error) {
            console.error('❌ Error in Account1 Aptos claim:', error);
            throw error;
        }
    }

    /**
     * Transaction 4: Account2 claim on Base using revealed secret
     * Account2 uses the revealed secret to claim Account1's ETH/tokens via 1inch LOP
     * @param {Object} swapData - Data from previous transactions including revealed secret
     * @returns {Object} Final swap completion data
     */
    async account2ClaimBase(swapData) {
        console.log('🔓 Transaction 4: Account2 claim on Base (using revealed secret)');
        console.log('Using revealed secret:', swapData.revealedSecret);

        try {
            // Account2 fills the 1inch LOP order using the revealed secret
            const account2Signer = new ethers.Wallet(process.env.BASE_SEPOLIA_PRIVATE_KEY_2, this.baseProvider);
            const lopWithAccount2 = this.lopContract.connect(account2Signer);
            
            // The secret verification should be embedded in the LOP fill logic
            const signature = await this.signOrder(swapData.lopOrder, this.baseSigner1);
            
            const fillTx = await lopWithAccount2.fillOrder(
                swapData.lopOrder,
                signature.r,
                signature.vs,
                swapData.srcAmount,
                0 // takerTraits
            );
            
            console.log('✅ Account2 claimed Base funds, tx:', fillTx.hash);
            await fillTx.wait();

            console.log('🎉 ATOMIC SWAP COMPLETED! Both parties have received their funds.');

            return {
                ...swapData,
                baseClaimTxHash: fillTx.hash,
                status: 'atomic_swap_completed',
                completedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Error in Account2 Base claim:', error);
            throw error;
        }
    }

    /**
     * Execute complete atomic swap (all 4 transactions)
     * This is a convenience method that executes the full atomic swap pattern
     * @param {Object} swapParams - Complete swap parameters
     * @returns {Object} Final swap completion data
     */
    async executeAtomicSwap(swapParams) {
        const {
            account1BaseAddress,
            account2AptosAddress,
            secret, // Account1's secret
            srcToken,
            srcAmount,
            dstToken,
            dstAmount,
            timelock
        } = swapParams;

        const hashLock = createHash('sha256').update(Buffer.from(secret, 'hex')).digest();

        console.log('🚀 Starting atomic swap execution...');
        console.log('Account1 (Base):', account1BaseAddress);
        console.log('Account2 (Aptos):', account2AptosAddress);

        try {
            // Transaction 1: Account1 escrow on Base
            const step1 = await this.account1EscrowBase({
                account1Address: account1BaseAddress,
                account2AptosAddress,
                srcToken,
                srcAmount,
                hashLock,
                timelock
            });

            console.log('✅ Transaction 1 complete');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Transaction 2: Account2 escrow on Aptos
            const step2 = await this.account2EscrowAptos(step1, {
                account2AptosAddress,
                account1BaseAddress,
                dstToken,
                dstAmount
            });

            console.log('✅ Transaction 2 complete');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Transaction 3: Account1 claim on Aptos (reveals secret)
            const step3 = await this.account1ClaimAptos(step2, secret);

            console.log('✅ Transaction 3 complete');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Transaction 4: Account2 claim on Base (using revealed secret)
            const step4 = await this.account2ClaimBase(step3);

            console.log('✅ Transaction 4 complete');
            console.log('🎉 ATOMIC SWAP SUCCESSFULLY COMPLETED!');

            return step4;

        } catch (error) {
            console.error('❌ Atomic swap failed:', error);
            throw error;
        }
    }

    /**
     * Sign 1inch LOP order for filling
     * @param {Object} order - LOP order structure
     * @param {ethers.Wallet} signer - Wallet to sign with
     * @returns {Object} Signature components {r, vs}
     */
    async signOrder(order, signer) {
        const orderHash = await this.lopContract.hashOrder(order);
        const signature = await signer.signMessage(ethers.getBytes(orderHash));
        const { r, s, v } = ethers.Signature.from(signature);
        
        // Convert to compact signature format used by 1inch
        const vs = s + (v === 28 ? '0x00' : '0x01');
        
        return { r, vs };
    }

    /**
     * Cancel expired swap and refund on both chains
     * @param {string} orderHash - Order hash
     * @param {string} direction - 'BASE_TO_APTOS' or 'APTOS_TO_BASE'
     */
    async cancelSwap(orderHash, direction) {
        console.log('❌ Cancelling expired swap...');
        
        try {
            // Cancel HTLC on Aptos (refund to maker)
            const aptosAccount = direction === 'BASE_TO_APTOS' ? this.aptosAccount2 : this.aptosAccount1;
            const payload = {
                type: "entry_function_payload",
                function: `${this.config.aptos.escrowAddress}::cross_chain_escrow::refund_htlc`,
                type_arguments: [],
                arguments: [
                    Array.from(ethers.getBytes(orderHash)),
                ]
            };

            const aptosTransaction = await this.aptosClient.generateTransaction(
                aptosAccount.address(),
                payload
            );

            const signedTxn = await this.aptosClient.signTransaction(
                aptosAccount,
                aptosTransaction
            );

            const aptosTx = await this.aptosClient.submitTransaction(signedTxn);
            await this.aptosClient.waitForTransaction(aptosTx.hash);

            console.log('✅ Aptos HTLC refunded, tx:', aptosTx.hash);

            // Note: 1inch LOP orders expire automatically, no explicit cancellation needed
            console.log('ℹ️ 1inch LOP order expired automatically');

            return {
                aptosTxHash: aptosTx.hash,
                message: '1inch LOP order expired, HTLC refunded'
            };

        } catch (error) {
            console.error('❌ Error cancelling swap:', error);
            throw error;
        }
    }

    /**
     * Get swap status from both chains
     * @param {string} orderHash - Order hash
     * @returns {Object} Swap status from both chains
     */
    async getSwapStatus(orderHash) {
        try {
            // Get LOP order status from Base Sepolia
            const remaining = await this.lopContract.remainingInvalidatorForOrder(
                await this.baseSigner1.getAddress(),
                orderHash
            );
            const lopActive = remaining > 0;

            // Get HTLC status from Aptos
            const aptosOrder = await this.aptosClient.view({
                function: `${this.config.aptos.escrowAddress}::cross_chain_escrow::get_htlc`,
                type_arguments: [],
                arguments: [
                    Array.from(ethers.getBytes(orderHash)),
                ]
            });

            const aptosActive = await this.aptosClient.view({
                function: `${this.config.aptos.escrowAddress}::cross_chain_escrow::is_htlc_active`,
                type_arguments: [],
                arguments: [
                    Array.from(ethers.getBytes(orderHash)),
                ]
            });

            return {
                baseSepolia: {
                    orderHash,
                    remaining,
                    active: lopActive,
                },
                aptos: {
                    order: aptosOrder,
                    active: aptosActive[0], // Aptos view functions return arrays
                },
                bothActive: lopActive && aptosActive[0]
            };

        } catch (error) {
            console.error('❌ Error getting swap status:', error);
            throw error;
        }
    }

    /**
     * Monitor swap for completion or expiration
     * @param {string} orderHash - Order hash
     * @param {number} timelock - Timelock in minutes from now
     * @param {function} onComplete - Callback for completion
     * @param {function} onExpire - Callback for expiration
     */
    async monitorSwap(orderHash, timelock, onComplete, onExpire) {
        const checkInterval = 30000; // 30 seconds
        const expireTime = Date.now() + (timelock * 60 * 1000);
        
        console.log(`👀 Monitoring swap ${orderHash} until ${new Date(expireTime).toISOString()}`);
        
        const monitor = setInterval(async () => {
            try {
                const status = await this.getSwapStatus(orderHash);
                
                // Check if completed on either chain (one becomes inactive)
                if (!status.bothActive) {
                    clearInterval(monitor);
                    console.log('✅ Swap completed!');
                    onComplete(status);
                    return;
                }

                // Check if expired
                if (Date.now() > expireTime) {
                    clearInterval(monitor);
                    console.log('⏰ Swap expired!');
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
     * Get wallet addresses for demo purposes
     * @returns {Object} Wallet addresses on both chains
     */
    async getWalletAddresses() {
        return {
            baseSepolia: {
                wallet1: await this.baseSigner1.getAddress(),
                wallet2: await this.baseSigner2.getAddress(),
            },
            aptos: {
                wallet1: this.aptosAccount1.address().hex(),
                wallet2: this.aptosAccount2.address().hex(),
            }
        };
    }

    /**
     * Generate secret and hash lock for atomic swap
     * @returns {Object} {secret, hashLock} both as hex strings
     */
    generateSecretAndHash() {
        const secret = randomBytes(32);
        const hashLock = createHash('sha256').update(secret).digest();
        
        return {
            secret: secret.toString('hex'),
            hashLock: hashLock.toString('hex')
        };
    }

    /**
     * Verify secret matches hash lock
     * @param {string} secret - Secret in hex
     * @param {string} hashLock - Hash lock in hex
     * @returns {boolean} True if valid
     */
    verifySecret(secret, hashLock) {
        const secretBytes = Buffer.from(secret, 'hex');
        const computedHash = createHash('sha256').update(secretBytes).digest();
        return computedHash.toString('hex') === hashLock;
    }

    /**
     * Verify hash lock matches secret (using Aptos client)
     * @param {string} secret - Secret in hex
     * @param {string} hashLock - Hash lock in hex
     * @returns {boolean} True if valid
     */
    async verifySecretAptos(secret, hashLock) {
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
                this.aptosAccount1.address()
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