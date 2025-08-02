'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Activity, Clock, DollarSign } from 'lucide-react'
import { useSwap } from '@/contexts/SwapContext'

export function StatsPanel() {
  const { state } = useSwap()

  const stats = [
    {
      label: 'Total Swaps',
      value: state.stats.total.toLocaleString(),
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Active Swaps',
      value: state.stats.active.toString(),
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
    },
    {
      label: 'Completed',
      value: state.stats.completed.toLocaleString(),
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      label: '24h Volume',
      value: `$${state.stats.volume24h}`,
      icon: DollarSign,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Network Statistics
        </h3>
        
        <div className="space-y-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                  <div className="font-semibold text-gray-900">{stat.value}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Chain Status */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Chain Status
        </h3>
        
        <div className="space-y-3">
          {[
            { name: 'Ethereum', status: 'online', color: 'bg-green-500' },
            { name: 'NEAR', status: 'online', color: 'bg-green-500' },
            { name: 'Aptos', status: 'online', color: 'bg-green-500' },
          ].map((chain, index) => (
            <motion.div
              key={chain.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${chain.color} animate-pulse`}></div>
                <span className="font-medium text-gray-900">{chain.name}</span>
              </div>
              <span className="text-sm text-green-600 capitalize">{chain.status}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Security Features */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Security Features
        </h3>
        
        <div className="space-y-3">
          {[
            { feature: 'Hash Time-Locked Contracts', status: 'Active' },
            { feature: 'Atomic Swaps', status: 'Enabled' },
            { feature: 'Trustless Execution', status: 'Verified' },
            { feature: 'Auto Refund', status: 'Ready' },
          ].map((item, index) => (
            <motion.div
              key={item.feature}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-600">{item.feature}</span>
              <span className="text-green-600 font-medium">✓ {item.status}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Live Price Feed (Mock) */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Live Rates
        </h3>
        
        <div className="space-y-3">
          {[
            { pair: 'ETH/NEAR', rate: '833.33', change: '+2.4%', trend: 'up' },
            { pair: 'ETH/APT', rate: '2500.00', change: '-1.2%', trend: 'down' },
            { pair: 'USDC/USDC', rate: '1.00', change: '0.0%', trend: 'stable' },
          ].map((rate, index) => (
            <motion.div
              key={rate.pair}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100"
            >
              <div>
                <div className="font-medium text-gray-900">{rate.pair}</div>
                <div className="text-sm text-gray-500">{rate.rate}</div>
              </div>
              <div className={`text-sm font-medium ${
                rate.trend === 'up' ? 'text-green-600' :
                rate.trend === 'down' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {rate.change}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}