# Setup and Deployment Guide

This guide will help you deploy and set up the 1inch Cross-Chain Fusion+ Extension for ETH<>NEAR and ETH<>Aptos swaps.

## Prerequisites

### Development Tools
- **Node.js** (v18 or higher)
- **pnpm** (v8 or higher)
- **Foundry** (for Ethereum contracts)
- **Rust** (for NEAR contracts)
- **Aptos CLI** (for Aptos contracts)

### Chain Access
- **Ethereum**: RPC endpoint and account with ETH for gas
- **NEAR**: NEAR account and access to NEAR RPC
- **Aptos**: Aptos account and access to Aptos RPC

## Installation

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd 1inch-cross-chain-fusion-plus
pnpm install
```

### 2. Install Chain-Specific Tools

#### Foundry (Ethereum)
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

#### Rust and NEAR CLI (NEAR)
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Install NEAR CLI
npm install -g near-cli
```

#### Aptos CLI (Aptos)
```bash
# Install Aptos CLI
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
```

## Configuration

### 1. Environment Setup

Copy the example environment file and fill in your configuration:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```bash
# Ethereum Configuration
ETH_RPC_URL=https://eth.merkle.io
ETH_PRIVATE_KEY=your_ethereum_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key

# NEAR Configuration
NEAR_NETWORK=testnet
NEAR_ACCOUNT_ID=your-account.testnet
NEAR_PRIVATE_KEY=your_near_private_key

# Aptos Configuration
APTOS_NETWORK=testnet
APTOS_PRIVATE_KEY=your_aptos_private_key
APTOS_ACCOUNT_ADDRESS=your_aptos_account_address

# 1inch API (optional for enhanced features)
ONEINCH_API_KEY=your_1inch_api_key
```

### 2. Account Setup

#### Ethereum Account
1. Create or import an Ethereum account
2. Fund it with ETH for gas fees
3. If testing on mainnet, ensure sufficient token balances

#### NEAR Account
```bash
# Create testnet account
near create-account your-account.testnet --masterAccount testnet

# Or use existing account
near login
```

#### Aptos Account
```bash
# Initialize new account
aptos init --network testnet

# Or import existing account
aptos init --private-key your_private_key --network testnet
```

## Deployment

### 1. Deploy Ethereum Contracts

#### Using Foundry
```bash
cd contracts/ethereum

# Install dependencies
forge install

# Deploy to testnet
forge script script/Deploy.s.sol:DeployScript --rpc-url $ETH_RPC_URL --private-key $ETH_PRIVATE_KEY --broadcast --verify

# Deploy to mainnet (when ready)
forge script script/Deploy.s.sol:DeployScript --rpc-url $ETH_MAINNET_RPC --private-key $ETH_PRIVATE_KEY --broadcast --verify
```

#### Manual Deployment
```bash
# Compile contracts
forge build

# Deploy CrossChainResolver
forge create src/CrossChainResolver.sol:CrossChainResolver --rpc-url $ETH_RPC_URL --private-key $ETH_PRIVATE_KEY --constructor-args "YOUR_INITIAL_OWNER_ADDRESS"
```

### 2. Deploy NEAR Contracts

```bash
cd contracts/near

# Build contract
cargo build --target wasm32-unknown-unknown --release

# Deploy to testnet
near dev-deploy target/wasm32-unknown-unknown/release/near_escrow.wasm

# Initialize contract
near call $CONTRACT_ID new '{"owner": "your-account.testnet"}' --accountId your-account.testnet

# Deploy to mainnet
near deploy --accountId your-contract.near --wasmFile target/wasm32-unknown-unknown/release/near_escrow.wasm
```

### 3. Deploy Aptos Contracts

```bash
cd contracts/aptos

# Compile contract
aptos move compile

# Deploy to testnet
aptos move publish --named-addresses escrow=your_account_address

# Initialize contract
aptos move run --function-id 'your_account_address::cross_chain_escrow::initialize' --args 'vector<string>["ETHEREUM"]'
```

## Configuration Update

After deployment, update your configuration with the deployed contract addresses:

```bash
# Update .env with deployed addresses
ETH_CROSS_CHAIN_RESOLVER_ADDRESS=0x...
NEAR_ESCROW_CONTRACT_ID=your-contract.testnet
APTOS_ESCROW_ADDRESS=0x...
```

## Testing

### 1. Unit Tests

```bash
# Test all components
pnpm test

# Test individual chains
forge test                    # Ethereum
cargo test                    # NEAR
aptos move test              # Aptos
```

### 2. Integration Tests

```bash
# Start local test environment
pnpm test:integration

# Test specific swap directions
pnpm test:eth-near
pnpm test:eth-aptos
```

### 3. Manual Testing

```bash
# Start the demo application
pnpm dev

# Or test specific orchestrators
node -e "
import { SwapManager } from './src/SwapManager.js';
const config = { /* your config */ };
const manager = new SwapManager(config);
await manager.initialize();
// Test swaps...
"
```

## Production Deployment

### 1. Security Checklist

- [ ] All private keys are stored securely (not in environment files)
- [ ] Contract ownership is set to appropriate multisig addresses
- [ ] All contracts have been audited
- [ ] Testnet testing completed successfully
- [ ] Emergency procedures documented

### 2. Mainnet Deployment

```bash
# Deploy to mainnet with production configuration
ETH_RPC_URL=https://eth.merkle.io \
NEAR_NETWORK=mainnet \
APTOS_NETWORK=mainnet \
pnpm deploy:mainnet
```

### 3. Monitoring Setup

```bash
# Set up monitoring and alerting
pnpm setup:monitoring

# Start monitoring services
pnpm start:monitoring
```

## Usage

### 1. Basic Swap Example

```javascript
import { SwapManager } from './src/SwapManager.js';

const config = {
  eth: {
    rpcUrl: process.env.ETH_RPC_URL,
    privateKey: process.env.ETH_PRIVATE_KEY,
    crossChainResolverAddress: process.env.ETH_CROSS_CHAIN_RESOLVER_ADDRESS,
  },
  near: {
    networkId: process.env.NEAR_NETWORK,
    nodeUrl: 'https://rpc.testnet.near.org',
    accountId: process.env.NEAR_ACCOUNT_ID,
    escrowContractId: process.env.NEAR_ESCROW_CONTRACT_ID,
  },
  aptos: {
    nodeUrl: 'https://fullnode.testnet.aptoslabs.com',
    privateKey: process.env.APTOS_PRIVATE_KEY,
    escrowAddress: process.env.APTOS_ESCROW_ADDRESS,
  },
};

const manager = new SwapManager(config);
await manager.initialize();

// Initiate ETH → NEAR swap
const swap = await manager.initiateSwap({
  srcChain: 'ETH',
  dstChain: 'NEAR',
  srcToken: '0x...', // USDC on Ethereum
  dstToken: 'NEAR',
  srcAmount: ethers.parseUnits('100', 6), // 100 USDC
  dstAmount: ethers.parseEther('50'), // 50 NEAR
  recipient: 'recipient.near',
  maker: '0x...',
});

console.log('Swap initiated:', swap.orderHash);

// Monitor and complete swap
manager.on('swapInitiated', (details) => {
  console.log('Swap initiated:', details.orderHash);
});

manager.on('swapCompleted', (details) => {
  console.log('Swap completed:', details.orderHash);
});
```

### 2. Advanced Configuration

```javascript
// Custom timelock configuration
const swap = await manager.initiateSwap({
  // ... swap parameters
  timeoutMinutes: 120, // 2 hour timeout
});

// Monitor swap status
const status = manager.getSwapDetails(swap.orderHash);
console.log('Current phase:', status.swapState.phase);
console.log('Time remaining:', status.swapState.timeRemaining);

// Manual completion (if auto-completion fails)
if (status.swapState.canComplete) {
  await manager.completeSwap(swap.orderHash);
}

// Manual cancellation (if expired)
if (status.swapState.canRefund) {
  await manager.cancelSwap(swap.orderHash);
}
```

## Troubleshooting

### Common Issues

1. **Transaction Failures**
   - Check gas prices and account balances
   - Verify contract addresses are correct
   - Ensure proper network configuration

2. **NEAR Contract Issues**
   - Verify account has enough NEAR for storage
   - Check contract is deployed and initialized
   - Ensure proper function call gas limits

3. **Aptos Contract Issues**
   - Verify account has enough APT for gas
   - Check contract compilation and deployment
   - Ensure proper type arguments in function calls

4. **Cross-Chain Synchronization**
   - Check network connectivity to all chains
   - Verify timelock configurations are appropriate
   - Monitor for failed transactions on either side

### Debug Mode

```bash
# Enable debug logging
DEBUG=swap-manager,eth-near,eth-aptos pnpm dev

# Verbose logging for specific components
DEBUG=* pnpm dev
```

### Support

For issues and support:
1. Check the [troubleshooting guide](./TROUBLESHOOTING.md)
2. Review logs for error messages
3. Test on testnets first
4. Contact the development team

## Security Considerations

1. **Private Key Management**
   - Never commit private keys to version control
   - Use environment variables or secure key management
   - Consider using hardware wallets for production

2. **Contract Security**
   - All contracts should be audited before mainnet deployment
   - Use multisig wallets for contract ownership
   - Implement emergency pause mechanisms

3. **Operational Security**
   - Monitor for unusual activity
   - Set up alerting for failed transactions
   - Implement proper access controls

4. **Testing**
   - Thoroughly test all swap directions
   - Test failure scenarios and recovery
   - Validate on testnets before mainnet deployment