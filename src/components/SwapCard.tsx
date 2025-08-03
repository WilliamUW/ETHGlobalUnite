"use client";

import { useState } from 'react';

export function SwapCard() {
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Swap</h2>
        {/* Settings button can go here */}
      </div>

      <div className="bg-gray-900 rounded-xl p-4 mb-2">
        <div className="flex items-center justify-between">
          <input
            type="number"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            className="bg-transparent text-2xl font-mono text-white w-full outline-none"
            placeholder="0"
          />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
            <span className="font-bold text-white">ETH</span>
          </div>
        </div>
        <div className="text-sm text-gray-400 mt-1">
          {/* Balance can go here */}
        </div>
      </div>

      <div className="flex justify-center my-2">
        <button className="p-2 bg-gray-700 rounded-full text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <input
            type="number"
            value={toAmount}
            onChange={(e) => setToAmount(e.target.value)}
            className="bg-transparent text-2xl font-mono text-white w-full outline-none"
            placeholder="0"
          />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-500 rounded-full"></div>
            <span className="font-bold text-white">APT</span>
          </div>
        </div>
        <div className="text-sm text-gray-400 mt-1">
          {/* Balance can go here */}
        </div>
      </div>

      {isConnected ? (
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">
          Swap
        </button>
      ) : (
        <button 
          onClick={() => setIsConnected(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
}
