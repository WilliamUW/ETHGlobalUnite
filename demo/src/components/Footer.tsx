'use client'

import { motion } from 'framer-motion'
import { Github, Twitter, Globe, Shield } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-20 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-1 md:col-span-2"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-1inch-500 to-1inch-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">1inch Cross-Chain Fusion+</h3>
                <p className="text-sm text-gray-500">Seamless atomic swaps across chains</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed max-w-md">
              Experience the future of DeFi with secure, trustless cross-chain swaps 
              powered by Hash Time-Locked Contracts (HTLC) technology.
            </p>
          </motion.div>

          {/* Technology */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Technology</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center space-x-2">
                <Shield className="w-3 h-3" />
                <span>HTLC Security</span>
              </li>
              <li>Atomic Swaps</li>
              <li>No Bridge Risk</li>
              <li>Trustless Execution</li>
              <li>Auto Refund</li>
            </ul>
          </motion.div>

          {/* Supported Chains */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Supported Chains</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-4 h-4 eth-gradient rounded-full"></div>
                <span>Ethereum</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-4 h-4 near-gradient rounded-full"></div>
                <span>NEAR Protocol</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-4 h-4 aptos-gradient rounded-full"></div>
                <span>Aptos</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between"
        >
          <div className="flex items-center space-x-6 mb-4 md:mb-0">
            <a
              href="https://github.com/1inch"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://twitter.com/1inch"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a
              href="https://1inch.io"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Globe className="w-5 h-5" />
            </a>
          </div>

          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <span>© 2024 1inch Network</span>
            <span>•</span>
            <span>Demo Version</span>
            <span>•</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Hackathon Build</span>
            </div>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <div className="text-sm text-amber-800">
            <strong>Demo Notice:</strong> This is a demonstration application built for the hackathon. 
            While the smart contracts implement real HTLC functionality, this demo uses testnet tokens. 
            Always verify contract addresses and use official 1inch interfaces for mainnet transactions.
          </div>
        </motion.div>
      </div>
    </footer>
  )
}