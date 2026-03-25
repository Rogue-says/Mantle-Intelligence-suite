import { useCallback } from 'react'

const KNOWN_PROTOCOLS = {
  '0xcDA86A272531e8640cD7F1a92c01839911B90bb0': { name: 'mETH', type: 'liquid_staking' },
  '0xE6829d9a7eE3040e1276Fa75293Bde931859e8fA': { name: 'cmETH', type: 'restaking' },
  '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8': { name: 'WMNT', type: 'wrapped_native' },
  '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE': { name: 'USDT', type: 'stablecoin' },
  '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9': { name: 'USDC', type: 'stablecoin' },
  '0xC96dE26018A54D51c097160568752c4E3BD6C364': { name: 'FBTC', type: 'bitcoin_wrapper' },
}

function estimatePriceImpact(inputAmount, poolTvl, fee = 0.003) {
  const slippage = (inputAmount / (poolTvl + inputAmount)) * 100
  const priceImpact = Math.min(slippage, 50)
  const feeCost = inputAmount * fee
  return {
    slippage: priceImpact.toFixed(4) + '%',
    feeCost: feeCost.toFixed(6),
    effectiveOutput: (inputAmount * (1 - fee) * (1 - priceImpact / 100)).toFixed(6),
    warning: priceImpact > 5 ? 'HIGH_SLIPPAGE' : priceImpact > 1 ? 'MODERATE_SLIPPAGE' : 'OK'
  }
}

function estimateGasCost(gasUnits, gasPrice = 0.001) {
  return {
    gasUnits: gasUnits.toString(),
    estimatedCostETH: (gasUnits * gasPrice / 1e9).toFixed(8),
    estimatedCostUSD: '~$0.01-0.05'
  }
}

const TX_GAS_ESTIMATES = {
  swap: 150000,
  addLiquidity: 250000,
  removeLiquidity: 250000,
  stake: 120000,
  unstake: 120000,
  deposit: 200000,
  withdraw: 200000,
  approve: 50000,
  transfer: 21000
}

export function useSimulation() {
  const simulateSwap = useCallback(async (tokenIn, tokenOut, amountIn, poolTvl = 1000000) => {
    const impact = estimatePriceImpact(amountIn, poolTvl)
    const gas = estimateGasCost(TX_GAS_ESTIMATES.swap)

    const tokenInInfo = KNOWN_PROTOCOLS[tokenIn] || { name: 'Unknown', type: 'unknown' }
    const tokenOutInfo = KNOWN_PROTOCOLS[tokenOut] || { name: 'Unknown', type: 'unknown' }

    return {
      status: impact.warning === 'HIGH_SLIPPAGE' ? 'WARNING' : 'SUCCESS',
      action: 'swap',
      input: { token: tokenInInfo.name, amount: amountIn },
      output: { token: tokenOutInfo.name, estimated: impact.effectiveOutput },
      priceImpact: impact.slippage,
      feeCost: impact.feeCost,
      gasEstimate: gas,
      risk: impact.warning === 'HIGH_SLIPPAGE'
        ? 'Price impact >5%. Consider splitting into smaller trades.'
        : 'Low impact. Safe to execute.',
      warnings: impact.warning !== 'OK' ? [impact.warning] : []
    }
  }, [])

  const simulateDeposit = useCallback(async (protocol, token, amount, currentApr) => {
    const gas = estimateGasCost(TX_GAS_ESTIMATES.deposit)
    const tokenInfo = KNOWN_PROTOCOLS[token] || { name: 'Unknown', type: 'unknown' }

    const projectedDaily = (amount * currentApr / 100) / 365
    const projectedMonthly = projectedDaily * 30
    const projectedYearly = amount * currentApr / 100

    return {
      status: 'SUCCESS',
      action: 'deposit',
      protocol,
      input: { token: tokenInfo.name, amount },
      projectedYield: {
        daily: projectedDaily.toFixed(6),
        monthly: projectedMonthly.toFixed(4),
        yearly: projectedYearly.toFixed(2)
      },
      gasEstimate: gas,
      risk: 'Funds locked until withdrawal. Smart contract risk applies.',
      warnings: []
    }
  }, [])

  const simulateLP = useCallback(async (tokenA, tokenB, amountA, amountB, poolApr, ilRisk = 0.05) => {
    const gas = estimateGasCost(TX_GAS_ESTIMATES.addLiquidity)
    const tokenAInfo = KNOWN_PROTOCOLS[tokenA] || { name: 'Unknown', type: 'unknown' }
    const tokenBInfo = KNOWN_PROTOCOLS[tokenB] || { name: 'Unknown', type: 'unknown' }

    const totalValue = amountA + amountB
    const projectedYield = totalValue * poolApr / 100
    const maxIL = totalValue * ilRisk
    const netExpected = projectedYield - maxIL

    return {
      status: 'SUCCESS',
      action: 'add_liquidity',
      pair: `${tokenAInfo.name}/${tokenBInfo.name}`,
      input: {
        tokenA: { symbol: tokenAInfo.name, amount: amountA },
        tokenB: { symbol: tokenBInfo.name, amount: amountB }
      },
      projectedYield: {
        feesYearly: projectedYield.toFixed(2),
        maxImpermanentLoss: maxIL.toFixed(2),
        netExpectedReturn: netExpected.toFixed(2)
      },
      gasEstimate: gas,
      risk: 'Impermanent loss risk if price ratio changes significantly.',
      warnings: netExpected < 0 ? ['NEGATIVE_NET_EXPECTED'] : []
    }
  }, [])

  const getRiskScore = useCallback((simulationResult) => {
    let score = 0
    if (simulationResult.warnings.includes('HIGH_SLIPPAGE')) score += 40
    if (simulationResult.warnings.includes('MODERATE_SLIPPAGE')) score += 15
    if (simulationResult.warnings.includes('NEGATIVE_NET_EXPECTED')) score += 30
    if (simulationResult.status === 'WARNING') score += 20

    const level = score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW'
    return { score, level, recommendation: level === 'HIGH' ? 'DO_NOT_PROCEED' : level === 'MEDIUM' ? 'PROCEED_WITH_CAUTION' : 'SAFE_TO_EXECUTE' }
  }, [])

  return { simulateSwap, simulateDeposit, simulateLP, getRiskScore }
}
