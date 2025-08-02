# 1inch Cross-Chain Fusion+ Extension

A cross-chain swap extension for 1inch Fusion+ that enables bidirectional swaps between Ethereum and NEAR/Aptos chains using Hash Time-Locked Contracts (HTLC).

## Features

- ✅ Bidirectional swaps: ETH ↔ NEAR and ETH ↔ Aptos
- ✅ Hash Time-Locked Contracts (HTLC) with proper hashlock and timelock functionality
- ✅ 1inch Escrow Factory integration on Ethereum side
- ✅ Custom escrow contracts for NEAR and Aptos
- ✅ Cross-chain orchestration layer
- ✅ Mainnet and testnet support

## Architecture

```
┌─────────────┐    HTLC Flow    ┌─────────────┐
│  Ethereum   │ ←─────────────→ │ NEAR/Aptos  │
│             │                 │             │
│ 1inch       │                 │ Custom      │
│ Escrow      │                 │ Escrow      │
│ Factory     │                 │ Contract    │
└─────────────┘                 └─────────────┘
```

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Setup environment:**
   ```bash
   cp .env.example .env
   # Fill in your keys and endpoints
   ```

3. **Build contracts:**
   ```bash
   pnpm build
   ```

4. **Run tests:**
   ```bash
   pnpm test
   ```

## Project Structure

```
├── contracts/
│   ├── ethereum/       # Solidity contracts using 1inch escrow factory
│   ├── near/          # NEAR smart contracts in Rust
│   └── aptos/         # Aptos Move contracts
├── src/               # Cross-chain orchestration layer
├── utils/             # Helper utilities
└── docs/              # Documentation
```

## Supported Chains

- **Ethereum**: Mainnet, Sepolia testnet
- **NEAR**: Mainnet, Testnet
- **Aptos**: Mainnet, Testnet

## License

MIT