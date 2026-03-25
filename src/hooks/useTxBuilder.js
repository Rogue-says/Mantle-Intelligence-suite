import { useCallback } from 'react'

const MANTLE_CHAIN_ID = 5000

const PROTOCOL_ADDRESSES = {
  mETH: {
    staking: '0xcDA86A272531e8640cD7F1a92c01839911B90bb0',
    router: '0x433E18d350e29a2442242424242424242424242424',
    type: 'liquid_staking'
  },
  cmETH: {
    staking: '0xE6829d9a7eE3040e1276Fa75293Bde931859e8fA',
    type: 'restaking'
  },
  agni: {
    router: '0x83a4ec40a65d4a7c26357424242424242424242424',
    factory: '0x83a4ec40a65d4a7c26357424242424242424242424',
    type: 'dex'
  },
  merchantMoe: {
    router: '0x83a4ec40a65d4a7c26357424242424242424242424',
    type: 'dex'
  },
  aave: {
    pool: '0x9E3007A79D31c9e296b8555eB51f44E8444Dd219',
    type: 'lending'
  },
  aurelius: {
    pool: '0x8F4424067b896F7a0E300F4E2a6f44D92B9a9B5a',
    type: 'lending'
  },
  lendle: {
    pool: '0x7Ac4E1c726E7b4aF9f810d0a2D5Fe0b4f3496D04',
    type: 'lending'
  }
}

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)'
]

const STAKE_ABI = [
  'function stake(uint256 amount)',
  'function withdraw(uint256 amount)',
  'function deposit(uint256 amount) returns (uint256)'
]

const LENDING_ABI = [
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
  'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
  'function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf) returns (uint256)'
]

const DEX_ABI = [
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)',
  'function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline)',
  'function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline)'
]

function buildApproveTx(tokenAddress, spenderAddress, amount) {
  return {
    to: tokenAddress,
    value: '0x0',
    data: {
      abi: ERC20_ABI,
      function: 'approve',
      args: [spenderAddress, amount]
    },
    description: `Approve ${spenderAddress.slice(0, 8)}... to spend tokens`
  }
}

function buildStakeTx(protocol, amount) {
  const config = PROTOCOL_ADDRESSES[protocol]
  if (!config) throw new Error(`Unknown protocol: ${protocol}`)

  return {
    to: config.staking,
    value: protocol === 'mETH' ? amount : '0x0',
    data: {
      abi: STAKE_ABI,
      function: 'stake',
      args: [amount]
    },
    description: `Stake ${amount} on ${protocol}`
  }
}

function buildDepositTx(protocol, assetAddress, amount, userAddress) {
  const config = PROTOCOL_ADDRESSES[protocol]
  if (!config) throw new Error(`Unknown protocol: ${protocol}`)

  return {
    to: config.pool,
    value: '0x0',
    data: {
      abi: LENDING_ABI,
      function: 'supply',
      args: [assetAddress, amount, userAddress, 0]
    },
    description: `Deposit to ${protocol} lending pool`
  }
}

function buildSwapTx(dex, tokenIn, tokenOut, amountIn, amountOutMin, userAddress, deadline) {
  const config = PROTOCOL_ADDRESSES[dex]
  if (!config) throw new Error(`Unknown DEX: ${dex}`)

  return {
    to: config.router,
    value: '0x0',
    data: {
      abi: DEX_ABI,
      function: 'swapExactTokensForTokens',
      args: [amountIn, amountOutMin, [tokenIn, tokenOut], userAddress, deadline]
    },
    description: `Swap on ${dex}`
  }
}

export function useTxBuilder() {
  const buildTransaction = useCallback((action, params) => {
    const { protocol, tokenAddress, amount, userAddress, tokenOut, amountOutMin, deadline } = params

    switch (action) {
      case 'approve': {
        const spender = PROTOCOL_ADDRESSES[protocol]?.staking
          || PROTOCOL_ADDRESSES[protocol]?.pool
          || PROTOCOL_ADDRESSES[protocol]?.router
        if (!spender) throw new Error(`Cannot find spender for ${protocol}`)
        return buildApproveTx(tokenAddress, spender, amount)
      }

      case 'stake':
        return buildStakeTx(protocol, amount)

      case 'deposit':
        return buildDepositTx(protocol, tokenAddress, amount, userAddress)

      case 'swap':
        return buildSwapTx(protocol, tokenAddress, tokenOut, amount, amountOutMin, userAddress, deadline || Math.floor(Date.now() / 1000) + 1200)

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }, [])

  const buildBatchTx = useCallback((actions) => {
    return actions.map(({ action, params }) => {
      try {
        const tx = buildTransaction(action, params)
        return { success: true, tx }
      } catch (e) {
        return { success: false, error: e.message, action }
      }
    })
  }, [buildTransaction])

  const estimateGas = useCallback((action) => {
    const gasEstimates = {
      approve: 50000,
      stake: 120000,
      unstake: 120000,
      deposit: 200000,
      withdraw: 200000,
      swap: 150000,
      addLiquidity: 250000,
      removeLiquidity: 250000,
      borrow: 200000,
      repay: 200000
    }
    return gasEstimates[action] || 150000
  }, [])

  const getTransactionSummary = useCallback((tx) => {
    return {
      to: tx.to,
      description: tx.description,
      estimatedGas: estimateGas(tx.data?.function || 'unknown'),
      chain: 'Mantle',
      chainId: MANTLE_CHAIN_ID,
      value: tx.value || '0x0'
    }
  }, [estimateGas])

  return { buildTransaction, buildBatchTx, estimateGas, getTransactionSummary, PROTOCOL_ADDRESSES }
}
