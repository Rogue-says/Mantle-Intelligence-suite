import { useCallback } from 'react'

export function calculateIL(priceRatio) {
  if (!Number.isFinite(priceRatio) || priceRatio <= 0) throw new Error('Price ratio must be positive');
  const sqrtR = Math.sqrt(priceRatio)
  const il = (2 * sqrtR) / (1 + priceRatio) - 1
  return Math.abs(il)
}

function calculateILMulti(priceChangeA, priceChangeB) {
  const ratio = (1 + priceChangeA) / (1 + priceChangeB)
  return calculateIL(ratio)
}

function formatPercent(value) {
  return (value * 100).toFixed(2) + '%'
}

function generateILCurve(steps = 20) {
  const points = []
  for (let i = 0; i <= steps; i++) {
    const ratio = 0.1 + (i / steps) * 3.8
    points.push({
      priceRatio: ratio.toFixed(2),
      il: formatPercent(calculateIL(ratio)),
      ilRaw: calculateIL(ratio)
    })
  }
  return points
}

function calculateNetReturn(ilPercent, feeApr, daysHolding) {
  if (![feeApr, daysHolding].every(Number.isFinite) || feeApr < 0 || daysHolding < 0) throw new Error('APR and holding days must be nonnegative');
  const feeReturn = (feeApr / 100) * (daysHolding / 365)
  const netReturn = feeReturn - ilPercent
  return {
    feeReturn: formatPercent(feeReturn),
    impermanentLoss: formatPercent(ilPercent),
    netReturn: formatPercent(netReturn),
    isProfit: netReturn >= 0,
    breakEvenDays: ilPercent > 0 ? (feeApr > 0 ? Math.ceil((ilPercent / (feeApr / 100)) * 365) : null) : 0
  }
}

export function useILCalculator() {
  const calculateForPosition = useCallback((params) => {
    const { tokenA, tokenB, amountA, amountB, entryPriceA, entryPriceB, currentPriceA, currentPriceB, feeApr, entryDate } = params

    validatePosition(params)
    const priceChangeA = (currentPriceA - entryPriceA) / entryPriceA
    const priceChangeB = (currentPriceB - entryPriceB) / entryPriceB
    const priceRatio = currentPriceA / currentPriceB / (entryPriceA / entryPriceB)

    const ilPercent = calculateIL(priceRatio)

    const totalValueAtEntry = (amountA * entryPriceA) + (amountB * entryPriceB)
    const ilDollarLoss = ((amountA * currentPriceA) + (amountB * currentPriceB)) * ilPercent

    if (entryDate && (!Number.isFinite(Date.parse(entryDate)) || Date.parse(entryDate) > Date.now())) throw new Error('Invalid entry date')
    const daysHolding = entryDate
      ? Math.floor((new Date() - new Date(entryDate)) / (1000 * 60 * 60 * 24))
      : 30

    const netReturn = calculateNetReturn(ilPercent, feeApr || 0, daysHolding)

    const currentHoldValue = (amountA * currentPriceA) + (amountB * currentPriceB)
    const holdValueNoLP = (amountA * entryPriceA * (1 + priceChangeA)) + (amountB * entryPriceB * (1 + priceChangeB))
    const lpValue = currentHoldValue * (1 - ilPercent)

    return {
      pair: `${tokenA}/${tokenB}`,
      entryValue: totalValueAtEntry.toFixed(2),
      currentLPValue: lpValue.toFixed(2),
      currentHoldValue: holdValueNoLP.toFixed(2),
      priceChange: {
        [tokenA]: formatPercent(priceChangeA),
        [tokenB]: formatPercent(priceChangeB)
      },
      impermanentLoss: {
        percent: formatPercent(ilPercent),
        dollarLoss: ilDollarLoss.toFixed(2)
      },
      netReturn,
      daysHolding,
      verdict: netReturn.isProfit
        ? `LP is profitable — fees (${netReturn.feeReturn}) exceed IL (${netReturn.impermanentLoss})`
        : `LP is underwater — IL (${netReturn.impermanentLoss}) exceeds fees (${netReturn.feeReturn}). Break even in ~${netReturn.breakEvenDays} days.`
    }
  }, [])

  const estimateILForPriceChange = useCallback((priceChangePercent, feeApr = 10, daysHolding = 30) => {
    const priceRatio = 1 + (priceChangePercent / 100)
    const ilPercent = calculateIL(priceRatio)
    const netReturn = calculateNetReturn(ilPercent, feeApr, daysHolding)

    return {
      priceChange: priceChangePercent + '%',
      impermanentLoss: formatPercent(ilPercent),
      feeReturn: netReturn.feeReturn,
      netReturn: netReturn.netReturn,
      isProfit: netReturn.isProfit,
      breakEvenDays: netReturn.breakEvenDays,
      verdict: netReturn.isProfit
        ? 'Profitable at this price change'
        : `Need ${netReturn.breakEvenDays} days at ${feeApr}% APR to break even`
    }
  }, [])

  const getILCurve = useCallback(() => {
    return generateILCurve()
  }, [])

  const compareLPvsHold = useCallback((params) => {
    const { amountA, amountB, entryPriceA, entryPriceB, currentPriceA, currentPriceB, feeApr, daysHolding } = params

    validatePosition(params)
    calculateNetReturn(0, feeApr, daysHolding)
    const holdPnlA = amountA * (currentPriceA - entryPriceA)
    const holdPnlB = amountB * (currentPriceB - entryPriceB)
    const holdTotalPnl = holdPnlA + holdPnlB

    const entryValue = (amountA * entryPriceA) + (amountB * entryPriceB)
    const priceRatio = (currentPriceA / currentPriceB) / (entryPriceA / entryPriceB)
    const ilPercent = calculateIL(priceRatio)

    const feeEarnings = entryValue * (feeApr / 100) * (daysHolding / 365)
    const holdValue = entryValue + holdTotalPnl
    const lpPnl = holdValue * (1 - ilPercent) - entryValue + feeEarnings

    return {
      holdStrategy: {
        pnl: holdTotalPnl.toFixed(2),
        returnPercent: ((holdTotalPnl / entryValue) * 100).toFixed(2) + '%'
      },
      lpStrategy: {
        pnl: lpPnl.toFixed(2),
        returnPercent: ((lpPnl / entryValue) * 100).toFixed(2) + '%',
        feeEarnings: feeEarnings.toFixed(2),
        ilCost: (holdValue * ilPercent).toFixed(2)
      },
      difference: (lpPnl - holdTotalPnl).toFixed(2),
      recommendation: lpPnl > holdTotalPnl
        ? 'LP outperforms holding in this scenario'
        : 'Holding outperforms LP in this scenario'
    }
  }, [])

  return { calculateForPosition, estimateILForPriceChange, getILCurve, compareLPvsHold }
}


function validatePosition(p) {
  for (const key of ['amountA', 'amountB', 'entryPriceA', 'entryPriceB', 'currentPriceA', 'currentPriceB']) {
    if (!Number.isFinite(p[key]) || p[key] <= 0) throw new Error(`${key} must be positive`)
  }
  const a = p.amountA * p.entryPriceA, b = p.amountB * p.entryPriceB
  if (Math.abs(a - b) > Math.max(a, b) * 1e-6) throw new Error('This model requires an initially equal-value 50/50 pool')
}
