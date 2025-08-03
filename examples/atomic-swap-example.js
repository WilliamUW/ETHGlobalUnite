import { config } from '../src/config/config.js';
import { ETHNEAROrchestrator } from '../src/orchestrator/ETHNEAROrchestrator.js';
import { ETHAptosOrchestrator } from '../src/orchestrator/ETHAptosOrchestrator.js';

/**
 * Example: Real Atomic Swap Implementation
 * 
 * This demonstrates the 4-transaction atomic swap pattern:
 * 1. Account1 escrow: Account1 locks funds on source chain with secret hash
 * 2. Account2 escrow: Account2 locks funds on destination chain with same secret hash
 * 3. Account1 claim: Account1 reveals secret to claim Account2 funds on destination chain
 * 4. Account2 claim: Account2 uses revealed secret to claim Account1 funds on source chain
 */

async function demonstrateAtomicSwap() {
    console.log('🚀 Atomic Swap Demonstration');
    console.log('============================');
    
    // Initialize orchestrator for Base <> NEAR swap
    const nearOrchestrator = new ETHNEAROrchestrator(config);
    await nearOrchestrator.initialize();

    // Example swap parameters
    const swapParams = {
        account1BaseAddress: await nearOrchestrator.baseSigner1.getAddress(),
        account2NearId: process.env.NEAR_ACCOUNT_ID_2,
        secret: nearOrchestrator.generateSecretAndHash().secret, // Account1's secret
        srcToken: config.baseSepolia.tokens.ETH,
        srcAmount: '1000000000000000', // 0.001 ETH
        dstToken: 'NEAR',
        dstAmount: '100000000000000000000000', // 0.1 NEAR
        timelock: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    console.log('\n📋 Swap Parameters:');
    console.log('Account1 (Base):', swapParams.account1BaseAddress);
    console.log('Account2 (NEAR):', swapParams.account2NearId);
    console.log('Account1 → Account2:', `${swapParams.srcAmount} wei ETH → ${swapParams.dstAmount} yoctoNEAR`);
    console.log('Secret (Account1 knows):', swapParams.secret);

    // Execute the complete atomic swap
    try {
        const result = await nearOrchestrator.executeAtomicSwap(swapParams);
        
        console.log('\n🎉 Atomic Swap Completed Successfully!');
        console.log('=====================================');
        console.log('Final Status:', result.status);
        console.log('Completed At:', result.completedAt);
        console.log('Base Claim Tx:', result.baseClaimTxHash);
        console.log('NEAR Claim Tx:', result.nearClaimTxHash);
        
    } catch (error) {
        console.error('\n❌ Atomic Swap Failed:', error.message);
    }
}

async function demonstrateIndividualTransactions() {
    console.log('\n🔧 Individual Transaction Demonstration');
    console.log('=======================================');
    
    const nearOrchestrator = new ETHNEAROrchestrator(config);
    await nearOrchestrator.initialize();

    // Generate secret and hash lock
    const { secret, hashLock } = nearOrchestrator.generateSecretAndHash();
    console.log('Generated Secret:', secret);
    console.log('Generated Hash Lock:', hashLock);

    const account1Address = await nearOrchestrator.baseSigner1.getAddress();
    const account2NearId = process.env.NEAR_ACCOUNT_ID_2;

    try {
        // Transaction 1: Account1 escrow on Base Sepolia
        console.log('\n🔒 Step 1: Account1 Escrow on Base Sepolia');
        const step1 = await nearOrchestrator.account1EscrowBase({
            account1Address,
            account2NearId,
            srcToken: config.baseSepolia.tokens.ETH,
            srcAmount: '1000000000000000', // 0.001 ETH
            hashLock: Buffer.from(hashLock, 'hex'),
            timelock: Math.floor(Date.now() / 1000) + 3600,
        });
        console.log('Status:', step1.status);
        console.log('Order Hash:', step1.orderHash);

        // Transaction 2: Account2 escrow on NEAR
        console.log('\n🔒 Step 2: Account2 Escrow on NEAR');
        const step2 = await nearOrchestrator.account2EscrowNEAR(step1, {
            account2NearId,
            account1BaseAddress: account1Address,
            dstToken: 'NEAR',
            dstAmount: '100000000000000000000000', // 0.1 NEAR
        });
        console.log('Status:', step2.status);
        console.log('NEAR Tx Hash:', step2.nearTxHash);

        // Transaction 3: Account1 claim on NEAR (reveals secret)
        console.log('\n🔓 Step 3: Account1 Claim on NEAR (Reveals Secret)');
        const step3 = await nearOrchestrator.account1ClaimNEAR(step2, secret);
        console.log('Status:', step3.status);
        console.log('Revealed Secret:', step3.revealedSecret);
        console.log('NEAR Claim Tx:', step3.nearClaimTxHash);

        // Transaction 4: Account2 claim on Base (using revealed secret)
        console.log('\n🔓 Step 4: Account2 Claim on Base (Using Revealed Secret)');
        const step4 = await nearOrchestrator.account2ClaimBase(step3);
        console.log('Status:', step4.status);
        console.log('Base Claim Tx:', step4.baseClaimTxHash);

        console.log('\n✅ All 4 transactions completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Transaction failed:', error.message);
    }
}

async function demonstrateAptosSwap() {
    console.log('\n🌟 Base Sepolia <> Aptos Atomic Swap');
    console.log('====================================');
    
    const aptosOrchestrator = new ETHAptosOrchestrator(config);
    await aptosOrchestrator.initialize();

    const swapParams = {
        account1BaseAddress: await aptosOrchestrator.baseSigner1.getAddress(),
        account2AptosAddress: aptosOrchestrator.aptosAccount2.address().hex(),
        secret: aptosOrchestrator.generateSecretAndHash().secret,
        srcToken: config.baseSepolia.tokens.ETH,
        srcAmount: '1000000000000000', // 0.001 ETH
        dstToken: '0x1::aptos_coin::AptosCoin',
        dstAmount: '100000', // 0.001 APT
        timelock: Math.floor(Date.now() / 1000) + 3600,
    };

    console.log('Account1 (Base):', swapParams.account1BaseAddress);
    console.log('Account2 (Aptos):', swapParams.account2AptosAddress);

    try {
        const result = await aptosOrchestrator.executeAtomicSwap(swapParams);
        console.log('\n✅ Aptos Atomic Swap Completed!');
        console.log('Status:', result.status);
        console.log('Base Claim Tx:', result.baseClaimTxHash);
        console.log('Aptos Claim Tx:', result.aptosClaimTxHash);
        
    } catch (error) {
        console.error('\n❌ Aptos Atomic Swap Failed:', error.message);
    }
}

async function demonstrateSecretGeneration() {
    console.log('\n🔐 Secret and Hash Lock Generation');
    console.log('==================================');
    
    const nearOrchestrator = new ETHNEAROrchestrator(config);
    
    // Generate multiple secret/hash pairs
    for (let i = 0; i < 3; i++) {
        const { secret, hashLock } = nearOrchestrator.generateSecretAndHash();
        console.log(`\nPair ${i + 1}:`);
        console.log('Secret:   ', secret);
        console.log('Hash Lock:', hashLock);
        
        // Verify the secret matches the hash
        const isValid = nearOrchestrator.verifySecret(secret, hashLock);
        console.log('Valid:    ', isValid ? '✅' : '❌');
    }
}

// Main execution
async function main() {
    console.log('1inch Cross-Chain Atomic Swap Example');
    console.log('=====================================');
    console.log('This example demonstrates real atomic swaps using:');
    console.log('• Base Sepolia (1inch LOP) ↔ NEAR (HTLC)');
    console.log('• Base Sepolia (1inch LOP) ↔ Aptos (HTLC)');
    console.log('');

    // Demonstrate secret generation
    await demonstrateSecretGeneration();

    // Choose which demonstration to run based on environment variable
    const demoType = process.env.DEMO_TYPE || 'individual';

    switch (demoType) {
        case 'full':
            await demonstrateAtomicSwap();
            break;
        case 'aptos':
            await demonstrateAptosSwap();
            break;
        case 'individual':
        default:
            await demonstrateIndividualTransactions();
            break;
    }
}

// Handle errors and run
main().catch(error => {
    console.error('Example failed:', error);
    process.exit(1);
});

export {
    demonstrateAtomicSwap,
    demonstrateIndividualTransactions,
    demonstrateAptosSwap,
    demonstrateSecretGeneration
};