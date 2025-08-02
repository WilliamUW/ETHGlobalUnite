'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface Token {
  symbol: string
  name: string
  decimals: number
  address: string
}

interface TokenInputProps {
  tokens: Token[]
  selectedToken: Token
  amount: string
  onTokenChange: (token: Token) => void
  onAmountChange: (amount: string) => void
  placeholder: string
  readOnly?: boolean
}

export function TokenInput({ 
  tokens, 
  selectedToken, 
  amount, 
  onTokenChange, 
  onAmountChange, 
  placeholder,
  readOnly = false
}: TokenInputProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const handleTokenSelect = (token: Token) => {
    onTokenChange(token)
    setIsDropdownOpen(false)
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        Token & Amount
      </label>
      
      <div className="relative">
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          {/* Token Selector */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {selectedToken.symbol.charAt(0)}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">{selectedToken.symbol}</div>
                  <div className="text-xs text-gray-500">{selectedToken.name}</div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
              >
                {tokens.map((token) => (
                  <button
                    key={token.symbol + token.address}
                    onClick={() => handleTokenSelect(token)}
                    className="flex items-center space-x-3 w-full p-3 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {token.symbol.charAt(0)}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">{token.symbol}</div>
                      <div className="text-xs text-gray-500">{token.name}</div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Amount Input */}
          <div className="relative">
            <input
              type="text"
              value={amount}
              onChange={(e) => !readOnly && onAmountChange(e.target.value)}
              placeholder={placeholder}
              readOnly={readOnly}
              className={`
                w-full text-2xl font-semibold bg-transparent border-none outline-none placeholder-gray-400
                ${readOnly ? 'text-gray-600 cursor-not-allowed' : 'text-gray-900'}
              `}
            />
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
              <button className="text-sm text-1inch-500 hover:text-1inch-600 font-medium">
                MAX
              </button>
            </div>
          </div>

          {/* Balance (Mock) */}
          <div className="text-xs text-gray-500">
            Balance: 1,234.56 {selectedToken.symbol}
          </div>
        </div>

        {/* Click outside to close dropdown */}
        {isDropdownOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}
      </div>
    </div>
  )
}