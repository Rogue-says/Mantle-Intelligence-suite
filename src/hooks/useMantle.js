import { useCallback } from 'react'

const MANTLE_RPC = import.meta.env.VITE_ALCHEMY_RPC || 'https://rpc.mantle.xyz'

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
]

const MANTLE_TOKENS = [
  { symbol: 'WMNT', address: '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8', decimals: 18 },
  { symbol: 'mETH', address: '0xcDA86A272531e8640cD7F1a92c01839911B90bb0', decimals: 18 },
  { symbol: 'cmETH', address: '0xE6829d9a7eE3040e1276Fa75293Bde931859e8fA', decimals: 18 },
  { symbol: 'USDT', address: '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE', decimals: 6 },
  { symbol: 'USDC', address: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9', decimals: 6 },
  { symbol: 'FBTC', address: '0xC96dE26018A54D51c097160568752c4E3BD6C364', decimals: 8 },
]

export function useMantle() {
  const getPortfolio = useCallback(async (address) => {
    try {
      const { ethers } = await import('ethers')
      const provider = new ethers.JsonRpcProvider(MANTLE_RPC)
      const mantleBalance = await provider.getBalance(address)
      const holdings = [{
        symbol: 'MNT (native)',
        balance: parseFloat(ethers.formatEther(mantleBalance)).toFixed(4),
        decimals: 18
      }]
      await Promise.all(MANTLE_TOKENS.map(async (token) => {
        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider)
          const balance = await contract.balanceOf(address)
          const formatted = parseFloat(ethers.formatUnits(balance, token.decimals))
          if (formatted > 0.0001) {
            holdings.push({ symbol: token.symbol, balance: formatted.toFixed(4), decimals: token.decimals })
          }
        } catch (e) { console.warn(`Failed to fetch ${token.symbol} balance:`, e) }
      }))
      return holdings
    } catch (e) {
      console.warn('Portfolio fetch failed:', e)
      return null
    }
  }, [])

  const getContractInfo = useCallback(async (address) => {
    try {
      const res = await fetch(
        `https://explorer.mantle.xyz/api?module=contract&action=getsourcecode&address=${address}`
      )
      const data = await res.json()
      return data.result?.[0] || null
    } catch (e) {
      console.warn('Contract info fetch failed:', e)
      return null
    }
  }, [])

  return { getPortfolio, getContractInfo }
}
