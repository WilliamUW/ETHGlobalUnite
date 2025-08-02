'use client'

import { motion } from 'framer-motion'

interface Chain {
  id: string
  name: string
  color: string
  icon: string
}

interface ChainSelectorProps {
  chains: Chain[]
  selectedChain: string
  onChange: (chainId: string) => void
  label: string
}

export function ChainSelector({ chains, selectedChain, onChange, label }: ChainSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </label>
      <div className="grid grid-cols-1 gap-2">
        {chains.map((chain) => (
          <motion.button
            key={chain.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(chain.id)}
            className={`
              relative p-4 rounded-xl border-2 transition-all duration-200 chain-connect
              ${selectedChain === chain.id
                ? 'border-1inch-500 bg-1inch-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }
            `}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full ${chain.color} flex items-center justify-center text-white text-lg font-bold shadow-lg`}>
                {chain.icon}
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">{chain.name}</h3>
                <p className="text-sm text-gray-500">{chain.id}</p>
              </div>
              {selectedChain === chain.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 bg-1inch-500 rounded-full flex items-center justify-center"
                >
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </motion.div>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}