'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown, ArrowRight, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { ChainSelector } from './ChainSelector'
import { TokenInput } from './TokenInput'
import { SwapPreview } from './SwapPreview'
import { useSwap } from '@/contexts/SwapContext'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'

const SUPPORTED_CHAINS = [
  { id: 'ETH', name: 'Ethereum', color: 'eth-gradient', icon: '⟠' },
  { id: 'NEAR', name: 'NEAR', color: 'near-gradient', icon: 'Ⓝ' },
  { id: 'APTOS', name: 'Aptos', color: 'aptos-gradient', icon: '🅰' },
]

const SUPPORTED_TOKENS = {
  ETH: [
    { symbol: 'ETH', name: 'Ethereum', decimals: 18, address: '0x0000000000000000000000000000000000000000' },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xA0b86a33E6441E6C1988d0cc6C8059F3aE3B2c71' },
  ],
  NEAR: [
    { symbol: 'NEAR', name: 'NEAR', decimals: 24, address: 'NEAR' },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: 'usdc.fakes.testnet' },
  ],
  APTOS: [
    { symbol: 'APT', name: 'Aptos', decimals: 8, address: '0x1::aptos_coin::AptosCoin' },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x...::usdc::USDC' },
  ],
}

export function SwapInterface() {
  const { state, initializeSwap } = useSwap()
  
  // Form state
  const [srcChain, setSrcChain] = useState('ETH')
  const [dstChain, setDstChain] = useState('NEAR')
  const [srcToken, setSrcToken] = useState(SUPPORTED_TOKENS.ETH[0])
  const [dstToken, setDstToken] = useState(SUPPORTED_TOKENS.NEAR[0])
  const [srcAmount, setSrcAmount] = useState('')
  const [dstAmount, setDstAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  
  // UI state
  const [showPreview, setShowPreview] = useState(false)
  const [swapStep, setSwapStep] = useState<'form' | 'preview' | 'initiating' | 'monitoring' | 'completed'>('form')

  // Handle chain swap
  const handleSwapChains = () => {
    const newSrcChain = dstChain
    const newDstChain = srcChain
    const newSrcToken = SUPPORTED_TOKENS[newSrcChain][0]
    const newDstToken = SUPPORTED_TOKENS[newDstChain][0]
    
    setSrcChain(newSrcChain)
    setDstChain(newDstChain)
    setSrcToken(newSrcToken)
    setDstToken(newDstToken)
    setSrcAmount(dstAmount)
    setDstAmount(srcAmount)
  }

  // Handle amount changes with basic rate calculation
  const handleSrcAmountChange = (amount: string) => {
    setSrcAmount(amount)
    if (amount && !isNaN(parseFloat(amount))) {
      // Simple mock rate calculation (in real app, would fetch from price oracle)
      const rate = srcToken.symbol === 'ETH' ? 2500 : srcToken.symbol === 'USDC' ? 1 : 0.5
      const dstRate = dstToken.symbol === 'NEAR' ? 3 : dstToken.symbol === 'USDC' ? 1 : 2000
      const convertedAmount = (parseFloat(amount) * rate / dstRate).toFixed(6)
      setDstAmount(convertedAmount)
    } else {
      setDstAmount('')
    }
  }

  // Validate form
  const isFormValid = () => {
    return (
      srcChain !== dstChain &&
      srcAmount &&
      parseFloat(srcAmount) > 0 &&
      dstAmount &&
      parseFloat(dstAmount) > 0 &&
      recipient.trim() !== ''
    )
  }

  // Handle swap initiation
  const handleInitiateSwap = async () => {
    if (!isFormValid()) {
      toast.error('Please fill in all fields correctly')
      return
    }

    try {
      setSwapStep('initiating')
      
      const swapParams = {
        srcChain,
        dstChain,
        srcToken: srcToken.address,
        dstToken: dstToken.address,
        srcAmount: ethers.parseUnits(srcAmount, srcToken.decimals),
        dstAmount: ethers.parseUnits(dstAmount, dstToken.decimals),
        recipient: recipient.trim(),
        maker: '0x742d35Cc6634C0532925a3b8D9c4D7B4e4F71D8C', // Demo address
        timeoutMinutes: 60,
      }

      const swapDetails = await initializeSwap(swapParams)
      setSwapStep('monitoring')
      
      // Auto-complete after a delay for demo purposes
      setTimeout(() => {
        setSwapStep('completed')
        toast.success('🎉 Swap completed successfully!')
      }, 5000)
      
    } catch (error) {
      console.error('Swap initiation failed:', error)
      toast.error(`Swap failed: ${error.message}`)
      setSwapStep('form')
    }
  }

  // Reset form
  const handleReset = () => {
    setSwapStep('form')
    setSrcAmount('')
    setDstAmount('')
    setRecipient('')
    setShowPreview(false)
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Cross-Chain Swap</h2>
        <div className="flex items-center space-x-2">
          {swapStep === 'completed' && (
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          )}
          {(swapStep === 'initiating' || swapStep === 'monitoring') && (
            <Loader2 className="w-6 h-6 text-1inch-500 animate-spin" />
          )}
        </div>
      </div>

      {swapStep === 'form' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Source Chain & Token */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">From</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChainSelector
                chains={SUPPORTED_CHAINS}
                selectedChain={srcChain}
                onChange={setSrcChain}
                label="Source Chain"
              />
              <TokenInput
                tokens={SUPPORTED_TOKENS[srcChain]}
                selectedToken={srcToken}
                amount={srcAmount}
                onTokenChange={setSrcToken}
                onAmountChange={handleSrcAmountChange}
                placeholder="0.0"
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSwapChains}
              className="p-3 bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200"
            >
              <ArrowUpDown className="w-5 h-5 text-gray-600" />
            </motion.button>
          </div>

          {/* Destination Chain & Token */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">To</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChainSelector
                chains={SUPPORTED_CHAINS.filter(chain => chain.id !== srcChain)}
                selectedChain={dstChain}
                onChange={setDstChain}
                label="Destination Chain"
              />
              <TokenInput
                tokens={SUPPORTED_TOKENS[dstChain]}
                selectedToken={dstToken}
                amount={dstAmount}
                onTokenChange={setDstToken}
                onAmountChange={setDstAmount}
                placeholder="0.0"
                readOnly
              />
            </div>
          </div>

          {/* Recipient Address */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Recipient Address ({dstChain})
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={`Enter ${dstChain} address...`}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-1inch-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPreview(true)}
              disabled={!isFormValid()}
              className="w-full bg-gradient-to-r from-1inch-500 to-1inch-600 text-white py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-200"
            >
              Preview Swap
            </motion.button>
            
            {showPreview && (
              <SwapPreview
                srcChain={srcChain}
                dstChain={dstChain}
                srcToken={srcToken}
                dstToken={dstToken}
                srcAmount={srcAmount}
                dstAmount={dstAmount}
                recipient={recipient}
                onConfirm={handleInitiateSwap}
                onCancel={() => setShowPreview(false)}
              />
            )}
          </div>
        </motion.div>
      )}

      {(swapStep === 'initiating' || swapStep === 'monitoring') && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8 space-y-6"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-1inch-100 rounded-full">
            <Loader2 className="w-8 h-8 text-1inch-500 animate-spin" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {swapStep === 'initiating' ? 'Initiating Swap...' : 'Processing Swap...'}
            </h3>
            <p className="text-gray-600">
              {swapStep === 'initiating' 
                ? 'Creating HTLC contracts on both chains'
                : 'Waiting for secret reveal and completion'
              }
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Source Chain ({srcChain})</span>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Destination Chain ({dstChain})</span>
              {swapStep === 'monitoring' ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>
          </div>
        </motion.div>
      )}

      {swapStep === 'completed' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8 space-y-6"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Swap Completed! 🎉
            </h3>
            <p className="text-gray-600">
              Your cross-chain swap has been successfully executed
            </p>
          </div>

          <div className="bg-green-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Sent: {srcAmount} {srcToken.symbol}</span>
              <span className="text-green-600">✓</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Received: {dstAmount} {dstToken.symbol}</span>
              <span className="text-green-600">✓</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="w-full bg-gradient-to-r from-1inch-500 to-1inch-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
          >
            Start New Swap
          </motion.button>
        </motion.div>
      )}
    </div>
  )
}