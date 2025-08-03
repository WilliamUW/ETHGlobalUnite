# 1inch Cross-Chain Fusion+ Demo

A beautiful demo application showcasing real cross-chain atomic swaps between Ethereum, NEAR, and Aptos using Hash Time-Locked Contracts (HTLC).

## ✨ Features

- **Real Cross-Chain Swaps**: Actual HTLC transactions on testnet/mainnet
- **Beautiful UI**: Modern, responsive interface with smooth animations
- **Multi-Chain Support**: ETH ↔ NEAR and ETH ↔ Aptos swaps
- **Security First**: HTLC ensures atomic execution or automatic refunds
- **Live Statistics**: Real-time swap monitoring and chain status
- **Mobile Friendly**: Responsive design that works on all devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm or npm
- Testnet accounts on Ethereum, NEAR, and Aptos
- Deployed smart contracts (see main project setup)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd demo
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start development server:**
   ```bash
   pnpm dev
   ```

4. **Open in browser:**
   ```
   http://localhost:3000
   ```

## 🎯 Demo Flow

1. **Select Chains**: Choose source and destination chains (ETH, NEAR, Aptos)
2. **Choose Tokens**: Select tokens and enter amounts
3. **Enter Recipient**: Provide destination chain address
4. **Preview Swap**: Review details and security features
5. **Execute Swap**: Real HTLC contracts are created on both chains
6. **Monitor Progress**: Watch real-time swap execution
7. **Celebrate**: Swap completes with confetti! 🎉

## 🔧 Configuration

### Demo Mode Settings

```env
# Enable demo features
NEXT_PUBLIC_DEMO_MODE=true

# Use real contracts (not mocked)
NEXT_PUBLIC_ENABLE_REAL_SWAPS=true

# Show mock balances for better UX
NEXT_PUBLIC_MOCK_BALANCES=true
```

### Chain Configuration

The demo supports three chains:

- **Ethereum**: ETH, USDC
- **NEAR**: NEAR, USDC
- **Aptos**: APT, USDC

### Contract Addresses

Update these in your `.env.local`:

```env
# Ethereum (deployed CrossChainResolver)
NEXT_PUBLIC_ETH_CROSS_CHAIN_RESOLVER_ADDRESS=0x...

# NEAR (deployed escrow contract)
NEXT_PUBLIC_NEAR_ESCROW_CONTRACT_ID=your-contract.testnet

# Aptos (deployed escrow module)
NEXT_PUBLIC_APTOS_ESCROW_ADDRESS=0x...
```

## 🏗️ Architecture

### Frontend Stack

- **Next.js 14**: App Router, TypeScript
- **Tailwind CSS**: Styling and responsive design
- **Framer Motion**: Smooth animations
- **React Hot Toast**: Notifications
- **Lucide React**: Beautiful icons

### Integration Layer

- **SwapContext**: React context for state management
- **SwapManager**: Core orchestration logic
- **Chain Orchestrators**: ETH↔NEAR and ETH↔Aptos handlers
- **HTLC Utils**: Cryptographic utilities for atomic swaps

### Real Smart Contracts

- **Ethereum**: Solidity contracts with 1inch integration
- **NEAR**: Rust contracts with HTLC functionality
- **Aptos**: Move contracts with atomic swap logic

## 🎨 UI Components

### SwapInterface
Main swap form with chain/token selection and amount input.

### ChainSelector
Beautiful chain selection with animated cards.

### TokenInput
Token selection with amount input and balance display.

### SwapPreview
Detailed preview modal with security information.

### StatsPanel
Live statistics and chain status monitoring.

### SwapHistory
Historical swap list with status tracking.

## 🔐 Security Features

### HTLC Implementation
- **Atomic Execution**: All-or-nothing swap guarantee
- **Time Locks**: Automatic refund after expiration
- **Hash Locks**: Cryptographically secure secret reveal
- **No Counterparty Risk**: Trustless execution

### Demo Safety
- Uses testnet by default
- Clear warnings about contract addresses
- Mock data for safe testing
- No private key exposure in frontend

## 🎭 Demo Customization

### Theming

Customize colors in `tailwind.config.js`:

```javascript
colors: {
  '1inch': { /* 1inch brand colors */ },
  'near': { /* NEAR brand colors */ },
  'aptos': { /* Aptos brand colors */ },
}
```

### Animations

Adjust animations in components:

```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
```

### Mock Data

Update mock data in components for demo purposes:

```javascript
// In SwapHistory.tsx
const mockSwaps = [
  // Add your demo swap data
]
```

## 📱 Mobile Experience

The demo is fully responsive:

- **Mobile-first design**: Works great on phones
- **Touch-friendly**: Large buttons and intuitive gestures
- **Optimized animations**: Smooth on all devices
- **Progressive enhancement**: Core functionality works everywhere

## 🐛 Troubleshooting

### Common Issues

1. **"Swap manager not initialized"**
   - Check your `.env.local` configuration
   - Ensure contracts are deployed and addresses are correct

2. **"Transaction failed"**
   - Verify you have testnet tokens
   - Check gas prices and network connectivity

3. **"Contract not found"**
   - Confirm contract addresses in environment variables
   - Ensure you're on the correct network (testnet/mainnet)

### Debug Mode

Enable debug logging:

```env
NEXT_PUBLIC_DEBUG=true
```

Check browser console for detailed logs.

## 🚀 Deployment

### Build for Production

```bash
pnpm build
```

### Deploy to Vercel

```bash
npx vercel
```

### Deploy to Netlify

```bash
pnpm build && pnpm export
# Upload dist/ folder to Netlify
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test thoroughly on testnet
5. Submit a pull request

## 📄 License

MIT License - see the main project for details.

## 🎉 Demo Credits

Built with ❤️ for the 1inch Hackathon, showcasing the power of cross-chain atomic swaps with beautiful UX.