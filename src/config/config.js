import 'dotenv/config';

/**
 * Configuration for 1inch Cross-Chain Fusion+ Extension
 * Uses deployed 1inch LOP on Base Sepolia + custom HTLC contracts on NEAR/Aptos
 */

export const config = {
  // Base Sepolia Configuration (Using deployed 1inch LOP)
  baseSepolia: {
    chainId: 84532,
    name: 'Base Sepolia',
    
    // Deployed 1inch LOP contract on Base Sepolia
    limitOrderProtocol: '0xE53136D9De56672e8D2665C98653AC7b8A60Dc44',
    
    // Base Sepolia token addresses
    tokens: {
      ETH: '0x0000000000000000000000000000000000000000', // Native ETH
      WETH: '0x4200000000000000000000000000000000000006', // Wrapped ETH on Base
      USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
    },
    
    // Explorer
    explorer: 'https://sepolia-explorer.base.org',
  },

  // NEAR Configuration
  near: {
    networkId: 'testnet',
    escrowContractId: process.env.NEAR_ESCROW_CONTRACT_ID,
    
    // NEAR tokens
    tokens: {
      NEAR: 'NEAR',
      USDC: 'usdc.fakes.testnet', // USDC on NEAR testnet
    },
    
    // Gas configuration
    gas: {
      create_htlc: '100000000000000', // 100 TGas
      complete_htlc: '100000000000000', // 100 TGas
      refund_htlc: '100000000000000', // 100 TGas
    },
  },

  // Aptos Configuration
  aptos: {
    network: 'testnet',
    escrowAddress: process.env.APTOS_ESCROW_ADDRESS,
    
    // Aptos tokens
    tokens: {
      APT: '0x1::aptos_coin::AptosCoin',
      USDC: '0x...::usdc::USDC', // To be deployed
    },
    
    // Gas configuration
    gas: {
      maxGasAmount: 10000,
      gasUnitPrice: 100,
    },
  },

  // 1inch LOP ABI (from the provided ABI.json file)
  lopABI: [
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "salt",
              "type": "uint256"
            },
            {
              "internalType": "Address",
              "name": "maker",
              "type": "uint256"
            },
            {
              "internalType": "Address",
              "name": "receiver",
              "type": "uint256"
            },
            {
              "internalType": "Address",
              "name": "makerAsset",
              "type": "uint256"
            },
            {
              "internalType": "Address",
              "name": "takerAsset",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "makingAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "takingAmount",
              "type": "uint256"
            },
            {
              "internalType": "MakerTraits",
              "name": "makerTraits",
              "type": "uint256"
            }
          ],
          "internalType": "struct IOrderMixin.Order",
          "name": "order",
          "type": "tuple"
        },
        {
          "internalType": "bytes32",
          "name": "r",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "vs",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "TakerTraits",
          "name": "takerTraits",
          "type": "uint256"
        }
      ],
      "name": "fillOrder",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "salt",
              "type": "uint256"
            },
            {
              "internalType": "Address",
              "name": "maker",
              "type": "uint256"
            },
            {
              "internalType": "Address",
              "name": "receiver",
              "type": "uint256"
            },
            {
              "internalType": "Address",
              "name": "makerAsset",
              "type": "uint256"
            },
            {
              "internalType": "Address",
              "name": "takerAsset",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "makingAmount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "takingAmount",
              "type": "uint256"
            },
            {
              "internalType": "MakerTraits",
              "name": "makerTraits",
              "type": "uint256"
            }
          ],
          "internalType": "struct IOrderMixin.Order",
          "name": "order",
          "type": "tuple"
        }
      ],
      "name": "hashOrder",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "maker",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "orderHash",
          "type": "bytes32"
        }
      ],
      "name": "remainingInvalidatorForOrder",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ],

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
      { src: 'BASE', dst: 'NEAR', tokens: ['ETH', 'USDC'] },
      { src: 'NEAR', dst: 'BASE', tokens: ['NEAR', 'USDC'] },
      { src: 'BASE', dst: 'APTOS', tokens: ['ETH', 'USDC'] },
      { src: 'APTOS', dst: 'BASE', tokens: ['APT', 'USDC'] },
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

  // Check required Base Sepolia config
  if (!process.env.BASE_SEPOLIA_PRIVATE_KEY_1) {
    errors.push('BASE_SEPOLIA_PRIVATE_KEY_1 is required');
  }
  if (!process.env.BASE_SEPOLIA_PRIVATE_KEY_2) {
    errors.push('BASE_SEPOLIA_PRIVATE_KEY_2 is required');
  }

  // Check required NEAR config
  if (!process.env.NEAR_ACCOUNT_ID_1) {
    errors.push('NEAR_ACCOUNT_ID_1 is required');
  }
  if (!process.env.NEAR_PRIVATE_KEY_1) {
    errors.push('NEAR_PRIVATE_KEY_1 is required');
  }
  if (!process.env.NEAR_ACCOUNT_ID_2) {
    errors.push('NEAR_ACCOUNT_ID_2 is required');
  }
  if (!process.env.NEAR_PRIVATE_KEY_2) {
    errors.push('NEAR_PRIVATE_KEY_2 is required');
  }
  if (!config.near.escrowContractId) {
    errors.push('NEAR_ESCROW_CONTRACT_ID is required');
  }

  // Check required Aptos config
  if (!process.env.APTOS_PRIVATE_KEY_1) {
    errors.push('APTOS_PRIVATE_KEY_1 is required');
  }
  if (!process.env.APTOS_PRIVATE_KEY_2) {
    errors.push('APTOS_PRIVATE_KEY_2 is required');
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