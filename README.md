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

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```

2.  **Setup environment:**
    Create a `.env` file by copying the example and fill in your private keys.
    ```bash
    cp .env.example .env
    ```

3.  **Build contracts:**
    ```bash
    pnpm build
    ```

4.  **Run tests:**
    ```bash
    pnpm test
    ```

## Environment Variables

The `.env` file requires the following variables for a complete cross-chain swap setup. You need two accounts for each chain to simulate a swap between two parties.

-   `BASE_SEPOLIA_PRIVATE_KEY_1`: Private key for the first account on Base Sepolia.
-   `BASE_SEPOLIA_PRIVATE_KEY_2`: Private key for the second account on Base Sepolia.
-   `NEAR_ACCOUNT_ID_1`: Account ID for the first account on NEAR.
-   `NEAR_PRIVATE_KEY_1`: Private key for the first account on NEAR.
-   `NEAR_ACCOUNT_ID_2`: Account ID for the second account on NEAR.
-   `NEAR_PRIVATE_KEY_2`: Private key for the second account on NEAR.
-   `NEAR_ESCROW_CONTRACT_ID`: The address of the NEAR escrow contract.
-   `APTOS_PRIVATE_KEY_1`: Private key for the first account on Aptos.
-   `APTOS_PRIVATE_KEY_2`: Private key for the second account on Aptos.
-   `APTOS_ESCROW_ADDRESS`: The address of the Aptos escrow contract. The current testnet address is `0xad80d336acde3c68e2d92cf4bc81436a624d5626ea67ee363231249becf9f06f`.

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