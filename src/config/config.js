import 'dotenv/config';

/**
 * Configuration for 1inch Cross-Chain Fusion+ Extension
 * Supports ETH<>NEAR and ETH<>Aptos swaps
 */

export const config = {
  // Ethereum Configuration
  eth: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth.merkle.io',
    privateKey: process.env.ETH_PRIVATE_KEY,
    crossChainResolverAddress: process.env.ETH_CROSS_CHAIN_RESOLVER_ADDRESS,
    crossChainResolverABI: [
      // Add ABI here after contract compilation
      'function initiateSwap(bytes32,address,uint256,string,string,string,uint256,bytes32,uint256) external payable',
      'function completeSwap(bytes32,bytes32,address) external',
      'function cancelSwap(bytes32) external',
      'function getSwapOrder(bytes32) external view returns (tuple)',
      'function isSwapActive(bytes32) external view returns (bool)',
    ],
    // Network configuration
    networks: {
      mainnet: {
        chainId: 1,
        rpcUrl: 'https://eth.merkle.io',
        escrowFactory: '0x...', // 1inch Escrow Factory on mainnet
      },
      sepolia: {
        chainId: 11155111,
        rpcUrl: 'https://eth-sepolia.public.blastapi.io',
        escrowFactory: '0x...', // 1inch Escrow Factory on sepolia
      },
    },
  },

  // NEAR Configuration
  near: {
    networkId: process.env.NEAR_NETWORK || 'testnet',
    nodeUrl: process.env.NEAR_NETWORK === 'mainnet' 
      ? 'https://rpc.mainnet.near.org'
      : 'https://rpc.testnet.near.org',
    walletUrl: process.env.NEAR_NETWORK === 'mainnet'
      ? 'https://wallet.mainnet.near.org'
      : 'https://wallet.testnet.near.org',
    helperUrl: process.env.NEAR_NETWORK === 'mainnet'
      ? 'https://helper.mainnet.near.org'
      : 'https://helper.testnet.near.org',
    accountId: process.env.NEAR_ACCOUNT_ID,
    privateKey: process.env.NEAR_PRIVATE_KEY,
    escrowContractId: process.env.NEAR_ESCROW_CONTRACT_ID,
    // Gas configuration
    gas: {
      create_htlc: '100000000000000', // 100 TGas
      complete_htlc: '100000000000000', // 100 TGas
      refund_htlc: '100000000000000', // 100 TGas
    },
  },

  // Aptos Configuration
  aptos: {
    network: process.env.APTOS_NETWORK || 'testnet',
    nodeUrl: process.env.APTOS_NETWORK === 'mainnet'
      ? 'https://fullnode.mainnet.aptoslabs.com'
      : 'https://fullnode.testnet.aptoslabs.com',
    privateKey: process.env.APTOS_PRIVATE_KEY,
    accountAddress: process.env.APTOS_ACCOUNT_ADDRESS,
    escrowAddress: process.env.APTOS_ESCROW_ADDRESS,
    // Gas configuration
    gas: {
      maxGasAmount: 10000,
      gasUnitPrice: 100,
    },
  },

  // 1inch API Configuration (optional)
  oneinch: {
    apiKey: process.env.ONEINCH_API_KEY,
    baseUrl: 'https://api.1inch.dev',
    // Supported networks for 1inch API
    networks: {
      ethereum: 1,
      polygon: 137,
      bsc: 56,
      arbitrum: 42161,
      optimism: 10,
      avalanche: 43114,
    },
  },

  // Swap Configuration
  swap: {
    // Default timelock durations (in minutes)
    defaultTimeout: 60, // 1 hour
    minTimeout: 15, // 15 minutes
    maxTimeout: 1440, // 24 hours
    
    // Safety margins
    safetyMargin: 10, // 10 minutes additional safety margin
    
    // Monitoring intervals
    monitoringInterval: 30000, // 30 seconds
    
    // Retry configuration
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    
    // Supported token mappings
    tokenMappings: {
      // Ethereum tokens
      ETH: {
        ethereum: '0x0000000000000000000000000000000000000000', // Native ETH
        near: 'NEAR', // Native NEAR
        aptos: '0x1::aptos_coin::AptosCoin', // Native APT
      },
      USDC: {
        ethereum: '0xA0b86a33E6441E6C1988d0cc6C8059F3aE3B2c71', // USDC on Ethereum
        near: 'usdc.fakes.testnet', // USDC on NEAR testnet
        aptos: '0x...', // USDC on Aptos (to be deployed)
      },
      USDT: {
        ethereum: '0x...',
        near: 'usdt.fakes.testnet',
        aptos: '0x...',
      },
    },
    
    // Supported swap pairs
    supportedPairs: [
      { src: 'ETH', dst: 'NEAR', tokens: ['ETH', 'USDC', 'USDT'] },
      { src: 'NEAR', dst: 'ETH', tokens: ['ETH', 'USDC', 'USDT'] },
      { src: 'ETH', dst: 'APTOS', tokens: ['ETH', 'USDC', 'USDT'] },
      { src: 'APTOS', dst: 'ETH', tokens: ['ETH', 'USDC', 'USDT'] },
    ],
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: true,
    enableFile: process.env.NODE_ENV === 'production',
    logDir: './logs',
  },

  // Development Configuration
  development: {
    enableTestMode: process.env.NODE_ENV !== 'production',
    mockTransactions: process.env.MOCK_TRANSACTIONS === 'true',
    skipValidation: process.env.SKIP_VALIDATION === 'true',
  },

  // Security Configuration
  security: {
    encryptSecrets: process.env.NODE_ENV === 'production',
    maxConcurrentSwaps: 10,
    rateLimitRequests: 100, // per minute
    enableCORS: true,
    allowedOrigins: ['http://localhost:3000', 'https://app.1inch.io'],
  },

  // Performance Configuration
  performance: {
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    maxCacheSize: 1000,
    connectionPoolSize: 10,
    requestTimeout: 30000, // 30 seconds
  },
};

/**
 * Validate configuration
 */
export function validateConfig() {
  const errors = [];

  // Check required Ethereum config
  if (!config.eth.privateKey) {
    errors.push('ETH_PRIVATE_KEY is required');
  }
  if (!config.eth.crossChainResolverAddress) {
    errors.push('ETH_CROSS_CHAIN_RESOLVER_ADDRESS is required');
  }

  // Check required NEAR config
  if (!config.near.accountId) {
    errors.push('NEAR_ACCOUNT_ID is required');
  }
  if (!config.near.privateKey) {
    errors.push('NEAR_PRIVATE_KEY is required');
  }
  if (!config.near.escrowContractId) {
    errors.push('NEAR_ESCROW_CONTRACT_ID is required');
  }

  // Check required Aptos config
  if (!config.aptos.privateKey) {
    errors.push('APTOS_PRIVATE_KEY is required');
  }
  if (!config.aptos.accountAddress) {
    errors.push('APTOS_ACCOUNT_ADDRESS is required');
  }
  if (!config.aptos.escrowAddress) {
    errors.push('APTOS_ESCROW_ADDRESS is required');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  console.log('✅ Configuration validated successfully');
}

/**
 * Get configuration for specific environment
 */
export function getEnvConfig(env = process.env.NODE_ENV) {
  const envConfig = { ...config };

  switch (env) {
    case 'development':
      envConfig.logging.level = 'debug';
      envConfig.development.enableTestMode = true;
      break;
    
    case 'staging':
      envConfig.near.networkId = 'testnet';
      envConfig.aptos.network = 'testnet';
      break;
    
    case 'production':
      envConfig.logging.enableFile = true;
      envConfig.security.encryptSecrets = true;
      envConfig.development.enableTestMode = false;
      envConfig.near.networkId = 'mainnet';
      envConfig.aptos.network = 'mainnet';
      break;
  }

  return envConfig;
}

/**
 * Get token address for specific chain
 */
export function getTokenAddress(tokenSymbol, chain) {
  const mapping = config.swap.tokenMappings[tokenSymbol];
  if (!mapping) {
    throw new Error(`Unsupported token: ${tokenSymbol}`);
  }
  
  const address = mapping[chain.toLowerCase()];
  if (!address) {
    throw new Error(`Token ${tokenSymbol} not supported on ${chain}`);
  }
  
  return address;
}

/**
 * Check if swap pair is supported
 */
export function isSupportedPair(srcChain, dstChain, tokenSymbol) {
  return config.swap.supportedPairs.some(pair => 
    pair.src === srcChain && 
    pair.dst === dstChain && 
    pair.tokens.includes(tokenSymbol)
  );
}

export default config;