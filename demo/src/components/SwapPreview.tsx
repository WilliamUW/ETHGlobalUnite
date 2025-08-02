'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Clock, Shield, Zap, X } from 'lucide-react'

interface SwapPreviewProps {
  srcChain: string
  dstChain: string
  srcToken: any
  dstToken: any
  srcAmount: string
  dstAmount: string
  recipient: string
  onConfirm: () => void
  onCancel: () => void
}

export function SwapPreview({
  srcChain,
  dstChain,
  srcToken,
  dstToken,
  srcAmount,
  dstAmount,
  recipient,
  onConfirm,
  onCancel
}: SwapPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-2xl p-6 max-w-md w-full space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Swap Preview</h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Swap Details */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">You Send</div>
                <div className="text-xl font-bold text-gray-900">
                  {srcAmount} {srcToken.symbol}
                </div>
                <div className="text-sm text-gray-500">{srcChain}</div>
              </div>
              
              <div className="px-3">
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">You Receive</div>
                <div className="text-xl font-bold text-gray-900">
                  {dstAmount} {dstToken.symbol}
                </div>
                <div className="text-sm text-gray-500">{dstChain}</div>
              </div>
            </div>
            
            <div className="text-center text-sm text-gray-600">
              Rate: 1 {srcToken.symbol} = {(parseFloat(dstAmount) / parseFloat(srcAmount)).toFixed(4)} {dstToken.symbol}
            </div>
          </div>

          {/* Recipient */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-500 mb-1">Recipient ({dstChain})</div>
            <div className="font-mono text-sm text-gray-900 break-all">
              {recipient}
            </div>
          </div>

          {/* Security Features */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Shield className="w-6 h-6 text-green-500 mx-auto mb-1" />
              <div className="text-xs font-medium text-green-700">HTLC</div>
              <div className="text-xs text-green-600">Secure</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Zap className="w-6 h-6 text-blue-500 mx-auto mb-1" />
              <div className="text-xs font-medium text-blue-700">Atomic</div>
              <div className="text-xs text-blue-600">All or Nothing</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
              <div className="text-xs font-medium text-yellow-700">1 Hour</div>
              <div className="text-xs text-yellow-600">Timeout</div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 text-amber-500 mt-0.5">⚠️</div>
              <div className="text-sm text-amber-800">
                <div className="font-medium mb-1">Important:</div>
                <ul className="text-xs space-y-1">
                  <li>• This swap uses HTLC technology for security</li>
                  <li>• You have 1 hour to complete the swap</li>
                  <li>• Funds will be refunded if swap expires</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCancel}
            className="py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            className="py-3 px-4 bg-gradient-to-r from-1inch-500 to-1inch-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
          >
            Confirm Swap
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}