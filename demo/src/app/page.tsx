'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SwapInterface } from '@/components/SwapInterface'
import { Header } from '@/components/Header'
import { StatsPanel } from '@/components/StatsPanel'
import { SwapHistory } from '@/components/SwapHistory'
import { Footer } from '@/components/Footer'
import { SwapProvider } from '@/contexts/SwapContext'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <SwapProvider>
      <main className="relative min-h-screen">
        {/* Header */}
        <Header />

        {/* Hero Section */}
        <section className="pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-1inch-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-6">
                Cross-Chain Fusion+
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Experience seamless atomic swaps between Ethereum, NEAR, and Aptos
                using Hash Time-Locked Contracts
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>No Bridge Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Atomic Swaps</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span>HTLC Security</span>
                </div>
              </div>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-12 gap-8">
              {/* Swap Interface */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="lg:col-span-8"
              >
                <SwapInterface />
              </motion.div>

              {/* Side Panel */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="lg:col-span-4 space-y-6"
              >
                <StatsPanel />
              </motion.div>
            </div>

            {/* Swap History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-12"
            >
              <SwapHistory />
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </main>
    </SwapProvider>
  )
}