import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: '1inch Cross-Chain Fusion+ Demo',
  description: 'Experience seamless cross-chain swaps between Ethereum, NEAR, and Aptos with 1inch Fusion+ technology',
  keywords: '1inch, cross-chain, DeFi, swap, Ethereum, NEAR, Aptos, Fusion+',
  authors: [{ name: '1inch Network' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0ea5e9" />
      </head>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50`}>
        <div className="relative min-h-screen">
          {/* Animated background particles */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="particle w-2 h-2 bg-1inch-400/30 top-1/4 left-1/4"></div>
            <div className="particle w-3 h-3 bg-near-400/30 top-3/4 left-1/3"></div>
            <div className="particle w-2 h-2 bg-aptos-400/30 top-1/2 left-3/4"></div>
            <div className="particle w-4 h-4 bg-purple-400/20 top-1/6 right-1/4"></div>
            <div className="particle w-3 h-3 bg-indigo-400/20 bottom-1/4 right-1/3"></div>
          </div>
          
          {children}
          
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(209, 213, 219, 0.3)',
                borderRadius: '12px',
                fontFamily: 'Inter, sans-serif',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#ffffff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </div>
      </body>
    </html>
  )
}