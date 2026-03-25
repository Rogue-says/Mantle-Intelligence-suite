import { useCallback } from 'react'

const MANTLE_RPC = 'https://rpc.mantle.xyz'

const LENDING_PROTOCOLS = {
  aave: {
    name: 'Aave (Mantle)',
    poolAddress: '0x9E3007A79D31c9e296b8555eB51f44E8444Dd219',
    liquidationThreshold: 0.82,
    ltv: 0.75
  },
  aurelius: {
    name: 'Aurelius',
    poolAddress: '0x8F4424067b896F7a0E300F4E2a6f44D92B9a9B5a',
    liquidationThreshold: 0.80,
    ltv: 0.70
  },
  lendle: {
    name: 'Lendle',
    poolAddress: '0x7Ac4E1c726E7b4aF9f810d0a2D5Fe0b4f3496D04',
    liquidationThreshold: 0.78,
    ltv: 0.65
  }
}

const COLLATERAL_FACTORS = {
  MNT: { priceVolatility: 0.15, collateralFactor: 0.65 },
  mETH: { priceVolatility: 0.12, collateralFactor: 0.80 },
  cmETH: { priceVolatility: 0.13, collateralFactor: 0.75 },
  USDT: { priceVolatility: 0.01, collateralFactor: 0.90 },
  USDC: { priceVolatility: 0.01, collateralFactor: 0.90 },
  FBTC: { priceVolatility: 0.10, collateralFactor: 0.75 },
  ETH: { priceVolatility: 0.12, collateralFactor: 0.80 },
  BTC: { priceVolatility: 0.10, collateralFactor: 0.75 }
}

function calculateHealthFactor(collateralValue, borrowValue, liquidationThreshold) {
  if (borrowValue === 0) return Infinity
  return (collateralValue * liquidationThreshold) / borrowValue
}

function calculateLiquidationPrice(entryPrice, collateralAmount, borrowAmount, liquidationThreshold) {
  if (collateralAmount === 0) return null
  const requiredCollateralValue = borrowAmount / liquidationThreshold
  return requiredCollateralValue / collateralAmount
}

function assessRiskLevel(healthFactor) {
  if (healthFactor >= 2.0) return { level: 'SAFE', color: 'green', action: 'No action needed' }
  if (healthFactor >= 1.5) return { level: 'MODERATE', color: 'yellow', action: 'Monitor closely' }
  if (healthFactor >= 1.2) return { level: 'ELEVATED', color: 'orange', action: 'Consider adding collateral or repaying debt' }
  if (healthFactor >= 1.1) return { level: 'DANGER', color: 'red', action: 'URGENT: Add collateral or repay now' }
  return { level: 'CRITICAL', color: 'red', action: 'IMMINENT LIQUIDATION: Act immediately' }
}

function calculateMaxDrawdownToLiquidation(currentPrice, liquidationPrice) {
  if (!liquidationPrice) return null
  return ((currentPrice - liquidationPrice) / currentPrice * 100).toFixed(2) + '%'
}

export function useRiskMonitor() {
  const calculatePositionRisk = useCallback((position) => {
    const { collateral, borrows, protocol = 'aave' } = position
    const protocolConfig = LENDING_PROTOCOLS[protocol] || LENDING_PROTOCOLS.aave

    const totalCollateralValue = collateral.reduce((sum, c) => {
      const factor = COLLATERAL_FACTORS[c.symbol]?.collateralFactor || 0.5
      return sum + (c.value * factor)
    }, 0)

    const totalBorrowValue = borrows.reduce((sum, b) => sum + b.value, 0)

    const healthFactor = calculateHealthFactor(
      totalCollateralValue,
      totalBorrowValue,
      protocolConfig.liquidationThreshold
    )

    const riskAssessment = assessRiskLevel(healthFactor)

    const liquidationScenarios = collateral.map(c => {
      const lp = calculateLiquidationPrice(c.price, c.amount, totalBorrowValue, protocolConfig.liquidationThreshold)
      const drawdown = calculateMaxDrawdownToLiquidation(c.price, lp)
      return {
        asset: c.symbol,
        currentPrice: c.price,
        liquidationPrice: lp,
        maxDrawdownToLiquidation: drawdown
      }
    })

    return {
      protocol: protocolConfig.name,
      healthFactor: healthFactor === Infinity ? '∞' : healthFactor.toFixed(2),
      riskLevel: riskAssessment.level,
      riskColor: riskAssessment.color,
      recommendedAction: riskAssessment.action,
      totalCollateralValue: totalCollateralValue.toFixed(2),
      totalBorrowValue: totalBorrowValue.toFixed(2),
      borrowUtilization: totalCollateralValue > 0
        ? ((totalBorrowValue / totalCollateralValue) * 100).toFixed(1) + '%'
        : '0%',
      liquidationScenarios,
      alerts: healthFactor < 1.5
        ? ['Health factor below 1.5 — liquidation risk is real']
        : []
    }
  }, [])

  const monitorWallet = useCallback(async (address) => {
    try {
      const { ethers } = await import('ethers')
      const provider = new ethers.JsonRpcProvider(MANTLE_RPC)

      const positions = []
      try {
        const balance = await provider.getBalance(address)
        if (balance > 0n) {
          for (const protocolKey of Object.keys(LENDING_PROTOCOLS)) {
            positions.push({
              protocol: protocolKey,
              collateral: [{
                symbol: 'MNT',
                amount: parseFloat(ethers.formatEther(balance)),
                value: parseFloat(ethers.formatEther(balance)) * 0.85,
                price: 0.85
              }],
              borrows: []
            })
          }
        }
      } catch (e) {
        console.warn('Could not fetch MNT balance:', e)
      }

      return positions.map(p => calculatePositionRisk(p))
    } catch (e) {
      console.warn('Wallet monitoring failed:', e)
      return []
    }
  }, [calculatePositionRisk])

  const getAlertThresholds = useCallback((healthFactor) => {
    return {
      critical: 1.1,
      danger: 1.2,
      elevated: 1.5,
      safe: 2.0,
      currentStatus: healthFactor >= 2.0 ? 'SAFE'
        : healthFactor >= 1.5 ? 'MONITOR'
        : healthFactor >= 1.2 ? 'WARNING'
        : healthFactor >= 1.1 ? 'DANGER'
        : 'CRITICAL'
    }
  }, [])

  return { calculatePositionRisk, monitorWallet, getAlertThresholds, LENDING_PROTOCOLS, COLLATERAL_FACTORS }
}
