# 1inch Cross-Chain Atomic Swap Extension

This project implements real atomic swaps between Base Sepolia and NEAR/Aptos using the 1inch Limit Order Protocol and Hash Time-Locked Contracts (HTLC).

## Atomic Swap Pattern

The implementation follows the classic 4-transaction atomic swap pattern:

### Transaction Flow

1. **Account1 Escrow** (Base Sepolia)
   - Account1 locks funds on Base Sepolia using 1inch LOP
   - Secret hash is embedded in the order (salt field)
   - Funds can only be claimed with the secret

2. **Account2 Escrow** (NEAR/Aptos)  
   - Account2 locks funds on destination chain using HTLC
   - Uses the same secret hash from Transaction 1
   - Funds can only be claimed with the secret

3. **Account1 Claim** (Destination Chain)
   - Account1 reveals the secret to claim Account2's funds
   - Secret is now publicly visible on-chain
   - This is the "point of no return" - the swap is now committed

4. **Account2 Claim** (Base Sepolia)
   - Account2 uses the revealed secret to claim Account1's funds via 1inch LOP
   - Atomic swap is now complete - both parties have their funds

## Architecture

```
Base Sepolia (1inch LOP)  ←→  NEAR/Aptos (HTLC)
     Account1                    Account2
         ↓                          ↓
  1. Escrow ETH              2. Escrow NEAR/APT
         ↑                          ↓  
  4. Account2 claims         3. Account1 claims
     (using revealed secret)    (reveals secret)
```

## Key Features

- **Trustless**: No intermediaries required
- **Atomic**: Either both parties get their funds or neither does
- **Non-custodial**: Participants control their own keys
- **Cross-chain**: Works between different blockchain ecosystems
- **Hash Time-Locked**: Built-in expiration for safety

## Contract Integration

### Base Sepolia (1inch LOP)
- Uses deployed 1inch Limit Order Protocol at `0xE53136D9De56672e8D2665C98653AC7b8A60Dc44`
- Secret hash embedded in order structure (salt field)
- Automatic expiration via 1inch LOP mechanisms

### NEAR Protocol (HTLC)
- Custom HTLC contract with hashlock/timelock functionality
- SHA256 hash verification
- Refund capability after timelock expiration

### Aptos (HTLC)
- Move-based HTLC contract with hashlock/timelock
- On-chain secret verification
- Automated refund after timelock

## Environment Setup

Required environment variables:

```bash
# Base Sepolia (2 wallets)
BASE_SEPOLIA_PRIVATE_KEY_1=0x...
BASE_SEPOLIA_PRIVATE_KEY_2=0x...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# NEAR (2 accounts)
NEAR_ACCOUNT_ID_1=account1.testnet
NEAR_ACCOUNT_ID_2=account2.testnet
NEAR_PRIVATE_KEY_1=ed25519:...
NEAR_PRIVATE_KEY_2=ed25519:...
NEAR_ESCROW_CONTRACT_ID=escrow.testnet

# Aptos (2 accounts)
APTOS_PRIVATE_KEY_1=0x...
APTOS_PRIVATE_KEY_2=0x...
APTOS_ESCROW_ADDRESS=0x...
```

## Usage Examples

### Complete Atomic Swap
```javascript
import { ETHNEAROrchestrator } from './src/orchestrator/ETHNEAROrchestrator.js';

const orchestrator = new ETHNEAROrchestrator(config);
await orchestrator.initialize();

const result = await orchestrator.executeAtomicSwap({
    account1BaseAddress: '0x...',
    account2NearId: 'account2.testnet', 
    secret: 'abc123...', // Account1's secret
    srcToken: config.baseSepolia.tokens.ETH,
    srcAmount: '1000000000000000', // 0.001 ETH
    dstToken: 'NEAR',
    dstAmount: '100000000000000000000000', // 0.1 NEAR
    timelock: Math.floor(Date.now() / 1000) + 3600, // 1 hour
});
```

### Individual Transactions
```javascript
// Transaction 1: Account1 escrow
const step1 = await orchestrator.account1EscrowBase({
    account1Address: '0x...',
    account2NearId: 'account2.testnet',
    srcToken: config.baseSepolia.tokens.ETH,
    srcAmount: '1000000000000000',
    hashLock: Buffer.from(hashLock, 'hex'),
    timelock: Math.floor(Date.now() / 1000) + 3600,
});

// Transaction 2: Account2 escrow  
const step2 = await orchestrator.account2EscrowNEAR(step1, {
    account2NearId: 'account2.testnet',
    account1BaseAddress: '0x...',
    dstToken: 'NEAR',
    dstAmount: '100000000000000000000000',
});

// Transaction 3: Account1 claim (reveals secret)
const step3 = await orchestrator.account1ClaimNEAR(step2, secret);

// Transaction 4: Account2 claim (using revealed secret)
const step4 = await orchestrator.account2ClaimBase(step3);
```

## Security Considerations

### Timelock Safety
- Set appropriate timelock duration (recommend 1-24 hours)
- Account1 should claim before 50% of timelock expires
- Account2 has remaining time to claim after secret revelation

### Secret Management
- Account1 must keep secret private until ready to claim
- Use cryptographically secure random generation
- Secret revelation is irreversible

### Transaction Ordering
- Transactions must execute in exact order (1→2→3→4)
- Monitor for timelock expiration between steps
- Implement retry logic for network issues

## Error Handling

### Common Failures
- **Insufficient balance**: Check token balances before initiating
- **Timelock expired**: Monitor timing and implement cancellation
- **Invalid secret**: Verify secret matches hash lock
- **Network congestion**: Implement retry with higher gas

### Recovery Mechanisms
- **Before secret revelation**: Both parties can refund after timelock
- **After secret revelation**: Account2 must claim or lose funds
- **Failed transactions**: Retry with higher gas/fees

## Testing

Run the example script:
```bash
# Individual transactions (recommended for testing)
DEMO_TYPE=individual node examples/atomic-swap-example.js

# Complete atomic swap
DEMO_TYPE=full node examples/atomic-swap-example.js

# Aptos swap
DEMO_TYPE=aptos node examples/atomic-swap-example.js
```

## Contract Deployment

### NEAR Contract
```bash
near deploy --wasmFile contracts/near/target/wasm32-unknown-unknown/release/near_escrow.wasm --accountId your-contract.testnet
```

### Aptos Contract
```bash
aptos move publish --package-dir contracts/aptos --named-addresses escrow=your_address
```

## Monitoring and Analytics

### Transaction Tracking
- Monitor each transaction status
- Log all hash locks and secrets
- Track timelock expiration
- Alert on failed transactions

### Metrics
- Swap success/failure rates
- Average completion time
- Gas/fee costs per swap
- Timelock utilization

## Future Enhancements

- **Multi-hop swaps**: Route through multiple chains
- **Batch processing**: Handle multiple swaps efficiently  
- **MEV protection**: Implement commit-reveal schemes
- **Cross-chain messaging**: Automate Account2 responses
- **Liquidity pools**: Integrate with DEX aggregators

## Contributing

1. Ensure all tests pass
2. Follow atomic swap security best practices
3. Document any new transaction patterns
4. Test on testnets before mainnet deployment

## License

This project implements the 1inch Cross-Chain Fusion+ extension for hackathon purposes.