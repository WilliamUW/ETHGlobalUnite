'use client'

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { SwapManager } from '../../../src/SwapManager.js'
import { config } from '../../../src/config/config.js'
import toast from 'react-hot-toast'

// Types
interface SwapState {
  manager: SwapManager | null
  isInitialized: boolean
  activeSwaps: any[]
  recentSwaps: any[]
  stats: {
    total: number
    completed: number
    active: number
    volume24h: string
  }
  currentSwap: any | null
  loading: boolean
  error: string | null
}

interface SwapAction {
  type: string
  payload?: any
}

// Initial state
const initialState: SwapState = {
  manager: null,
  isInitialized: false,
  activeSwaps: [],
  recentSwaps: [],
  stats: {
    total: 0,
    completed: 0,
    active: 0,
    volume24h: '0',
  },
  currentSwap: null,
  loading: false,
  error: null,
}

// Reducer
function swapReducer(state: SwapState, action: SwapAction): SwapState {
  switch (action.type) {
    case 'SET_MANAGER':
      return { ...state, manager: action.payload }
    
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload }
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    
    case 'SET_CURRENT_SWAP':
      return { ...state, currentSwap: action.payload }
    
    case 'ADD_SWAP':
      return {
        ...state,
        activeSwaps: [action.payload, ...state.activeSwaps],
        recentSwaps: [action.payload, ...state.recentSwaps.slice(0, 9)],
      }
    
    case 'UPDATE_SWAP':
      return {
        ...state,
        activeSwaps: state.activeSwaps.map(swap =>
          swap.orderHash === action.payload.orderHash ? action.payload : swap
        ),
        recentSwaps: state.recentSwaps.map(swap =>
          swap.orderHash === action.payload.orderHash ? action.payload : swap
        ),
      }
    
    case 'REMOVE_ACTIVE_SWAP':
      return {
        ...state,
        activeSwaps: state.activeSwaps.filter(swap => swap.orderHash !== action.payload),
      }
    
    case 'UPDATE_STATS':
      return { ...state, stats: action.payload }
    
    default:
      return state
  }
}

// Context
const SwapContext = createContext<{
  state: SwapState
  dispatch: React.Dispatch<SwapAction>
  initializeSwap: (swapParams: any) => Promise<any>
  completeSwap: (orderHash: string) => Promise<void>
  cancelSwap: (orderHash: string) => Promise<void>
  refreshStats: () => void
}>({
  state: initialState,
  dispatch: () => {},
  initializeSwap: async () => {},
  completeSwap: async () => {},
  cancelSwap: async () => {},
  refreshStats: () => {},
})

// Provider
export function SwapProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(swapReducer, initialState)

  // Initialize swap manager
  useEffect(() => {
    const initManager = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true })
        
        // Create swap manager with demo configuration
        const demoConfig = {
          ...config,
          // Override with demo/testnet settings
          development: {
            ...config.development,
            enableTestMode: true,
            mockTransactions: false, // Real transactions for demo
          }
        }
        
        const manager = new SwapManager(demoConfig)
        
        // Set up event listeners
        manager.on('swapInitiated', (details) => {
          dispatch({ type: 'ADD_SWAP', payload: details })
          toast.success('Swap initiated successfully!')
        })
        
        manager.on('swapCompleted', (details) => {
          dispatch({ type: 'UPDATE_SWAP', payload: { ...details, status: 'COMPLETED' } })
          dispatch({ type: 'REMOVE_ACTIVE_SWAP', payload: details.orderHash })
          toast.success('Swap completed! 🎉')
        })
        
        manager.on('swapCancelled', (details) => {
          dispatch({ type: 'UPDATE_SWAP', payload: { ...details, status: 'CANCELLED' } })
          dispatch({ type: 'REMOVE_ACTIVE_SWAP', payload: details.orderHash })
          toast.error('Swap cancelled')
        })
        
        manager.on('swapError', ({ orderHash, error }) => {
          dispatch({ type: 'SET_ERROR', payload: error })
          toast.error(`Swap error: ${error}`)
        })
        
        manager.on('swapExpired', ({ orderHash }) => {
          toast.error('Swap expired - will attempt auto-cancel')
        })
        
        // Initialize manager
        await manager.initialize()
        
        dispatch({ type: 'SET_MANAGER', payload: manager })
        dispatch({ type: 'SET_INITIALIZED', payload: true })
        dispatch({ type: 'SET_LOADING', payload: false })
        
        toast.success('Swap Manager initialized!')
        
      } catch (error) {
        console.error('Failed to initialize swap manager:', error)
        dispatch({ type: 'SET_ERROR', payload: error.message })
        toast.error('Failed to initialize swap manager')
      }
    }

    initManager()
  }, [])

  // Refresh stats periodically
  useEffect(() => {
    if (!state.manager) return

    const refreshStats = () => {
      if (state.manager) {
        const stats = state.manager.getStatistics()
        dispatch({ type: 'UPDATE_STATS', payload: {
          ...stats,
          volume24h: '1,234,567', // Mock volume for demo
        }})
      }
    }

    refreshStats()
    const interval = setInterval(refreshStats, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [state.manager])

  // Actions
  const initializeSwap = async (swapParams: any) => {
    if (!state.manager) {
      throw new Error('Swap manager not initialized')
    }

    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const swapDetails = await state.manager.initiateSwap(swapParams)
      dispatch({ type: 'SET_CURRENT_SWAP', payload: swapDetails })
      return swapDetails
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const completeSwap = async (orderHash: string) => {
    if (!state.manager) {
      throw new Error('Swap manager not initialized')
    }

    try {
      await state.manager.completeSwap(orderHash)
    } catch (error) {
      toast.error(`Failed to complete swap: ${error.message}`)
      throw error
    }
  }

  const cancelSwap = async (orderHash: string) => {
    if (!state.manager) {
      throw new Error('Swap manager not initialized')
    }

    try {
      await state.manager.cancelSwap(orderHash)
    } catch (error) {
      toast.error(`Failed to cancel swap: ${error.message}`)
      throw error
    }
  }

  const refreshStats = () => {
    if (state.manager) {
      const stats = state.manager.getStatistics()
      dispatch({ type: 'UPDATE_STATS', payload: {
        ...stats,
        volume24h: '1,234,567', // Mock volume for demo
      }})
    }
  }

  return (
    <SwapContext.Provider
      value={{
        state,
        dispatch,
        initializeSwap,
        completeSwap,
        cancelSwap,
        refreshStats,
      }}
    >
      {children}
    </SwapContext.Provider>
  )
}

// Hook
export function useSwap() {
  const context = useContext(SwapContext)
  if (!context) {
    throw new Error('useSwap must be used within a SwapProvider')
  }
  return context
}