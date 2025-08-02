'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Clock, XCircle, ArrowRight, ExternalLink } from 'lucide-react'
import { useSwap } from '@/contexts/SwapContext'

export function SwapHistory() {
  const { state } = useSwap()

  // Mock recent swaps for demo
  const mockSwaps = [
    {
      id: '1',
      orderHash: '0x1234...5678',
      srcChain: 'ETH',
      dstChain: 'NEAR',
      srcToken: 'ETH',
      dstToken: 'NEAR',
      srcAmount: '0.5',
      dstAmount: '416.67',
      status: 'COMPLETED',
      timestamp: Date.now() - 300000, // 5 minutes ago
      recipient: 'alice.near',
    },
    {
      id: '2',
      orderHash: '0x2345...6789',
      srcChain: 'NEAR',
      dstChain: 'APTOS',
      srcToken: 'NEAR',
      dstToken: 'APT',
      srcAmount: '100',
      dstAmount: '12',
      status: 'ACTIVE',
      timestamp: Date.now() - 180000, // 3 minutes ago
      recipient: '0x742d35Cc6634C0532925a3b8D9c4D7B4e4F71D8C',
    },
    {
      id: '3',
      orderHash: '0x3456...7890',
      srcChain: 'ETH',
      dstChain: 'APTOS',
      srcToken: 'USDC',
      dstToken: 'APT',
      srcAmount: '1000',
      dstAmount: '125.5',
      status: 'COMPLETED',
      timestamp: Date.now() - 900000, // 15 minutes ago
      recipient: '0x1234567890abcdef1234567890abcdef12345678',
    },
  ]

  const allSwaps = [...state.recentSwaps, ...mockSwaps].slice(0, 10)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'ACTIVE':
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />
      case 'CANCELLED':
      case 'EXPIRED':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'ACTIVE':
        return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED':
      case 'EXPIRED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const truncateAddress = (address: string) => {
    if (address.includes('.near') || address.includes('.testnet')) {
      return address.length > 20 ? `${address.slice(0, 17)}...` : address
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Recent Swaps</h3>
        <div className="text-sm text-gray-500">
          {allSwaps.length} swap{allSwaps.length !== 1 ? 's' : ''}
        </div>
      </div>

      {allSwaps.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowRight className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No swaps yet</h4>
          <p className="text-gray-500">Your swap history will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allSwaps.map((swap, index) => (
            <motion.div
              key={swap.id || swap.orderHash}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(swap.status)}
                  <div>
                    <div className="font-mono text-sm text-gray-600">
                      {swap.orderHash?.slice(0, 10)}...{swap.orderHash?.slice(-6)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(swap.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(swap.status)}`}>
                    {swap.status}
                  </span>
                  <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* From */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">From</div>
                  <div className="font-semibold text-gray-900">
                    {swap.srcAmount} {swap.srcToken}
                  </div>
                  <div className="text-xs text-gray-500">{swap.srcChain}</div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>

                {/* To */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">To</div>
                  <div className="font-semibold text-gray-900">
                    {swap.dstAmount} {swap.dstToken}
                  </div>
                  <div className="text-xs text-gray-500">{swap.dstChain}</div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Recipient: <span className="font-mono">{truncateAddress(swap.recipient)}</span>
                </div>
              </div>
            </motion.div>
          ))}

          {/* View More Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full py-3 text-center text-1inch-600 hover:bg-1inch-50 rounded-xl transition-colors duration-200 border border-1inch-200"
          >
            View All Swaps
          </motion.button>
        </div>
      )}
    </div>
  )
}