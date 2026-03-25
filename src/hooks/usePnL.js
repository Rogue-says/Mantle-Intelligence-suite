import { useCallback } from 'react'

const STORAGE_KEY = 'mantle_pnl_entries'

function getEntries() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch (e) {
    console.warn('Failed to save PnL entries:', e)
  }
}

function calculatePnL(entry, currentPrice) {
  const entryValue = entry.amount * entry.entryPrice
  const currentValue = entry.amount * currentPrice
  const pnl = currentValue - entryValue
  const pnlPercent = (pnl / entryValue) * 100

  return {
    ...entry,
    currentPrice,
    entryValue: entryValue.toFixed(4),
    currentValue: currentValue.toFixed(4),
    pnl: pnl.toFixed(4),
    pnlPercent: pnlPercent.toFixed(2) + '%',
    isProfit: pnl >= 0
  }
}

function calculateFeesPnL(entry, currentApr, daysHeld) {
  const entryValue = entry.amount * entry.entryPrice
  const feesEarned = (entryValue * currentApr / 100) * (daysHeld / 365)
  return {
    feesEarned: feesEarned.toFixed(4),
    feesEarnedAnnualized: (feesEarned * 365 / Math.max(daysHeld, 1)).toFixed(4)
  }
}

function getDaysHeld(entryDate) {
  const now = new Date()
  const entry = new Date(entryDate)
  return Math.floor((now - entry) / (1000 * 60 * 60 * 24))
}

export function usePnL() {
  const addEntry = useCallback((entry) => {
    const entries = getEntries()
    const newEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...entry
    }
    entries.push(newEntry)
    saveEntries(entries)
    return newEntry
  }, [])

  const getEntries_ = useCallback(() => {
    return getEntries()
  }, [])

  const calculatePortfolioPnL = useCallback((currentPrices) => {
    const entries = getEntries()
    if (entries.length === 0) return { positions: [], summary: null }

    const positions = entries.map(entry => {
      const currentPrice = currentPrices[entry.symbol] || entry.entryPrice
      const pnl = calculatePnL(entry, currentPrice)
      const daysHeld = getDaysHeld(entry.timestamp)

      let fees = null
      if (entry.apr) {
        fees = calculateFeesPnL(entry, entry.apr, daysHeld)
      }

      return {
        ...pnl,
        daysHeld,
        fees
      }
    })

    const totalEntryValue = positions.reduce((sum, p) => sum + parseFloat(p.entryValue), 0)
    const totalCurrentValue = positions.reduce((sum, p) => sum + parseFloat(p.currentValue), 0)
    const totalPnl = totalCurrentValue - totalEntryValue
    const totalPnlPercent = totalEntryValue > 0 ? (totalPnl / totalEntryValue * 100) : 0
    const totalFees = positions.reduce((sum, p) => sum + (p.fees ? parseFloat(p.fees.feesEarned) : 0), 0)

    const winners = positions.filter(p => p.isProfit)
    const losers = positions.filter(p => !p.isProfit)

    return {
      positions,
      summary: {
        totalEntryValue: totalEntryValue.toFixed(2),
        totalCurrentValue: totalCurrentValue.toFixed(2),
        totalPnl: totalPnl.toFixed(2),
        totalPnlPercent: totalPnlPercent.toFixed(2) + '%',
        totalFeesEarned: totalFees.toFixed(4),
        totalReturn: (totalPnl + totalFees).toFixed(2),
        totalReturnPercent: totalEntryValue > 0
          ? (((totalPnl + totalFees) / totalEntryValue) * 100).toFixed(2) + '%'
          : '0%',
        winRate: positions.length > 0
          ? ((winners.length / positions.length) * 100).toFixed(1) + '%'
          : 'N/A',
        winners: winners.length,
        losers: losers.length,
        bestPerformer: positions.length > 0
          ? positions.reduce((best, p) => parseFloat(p.pnlPercent) > parseFloat(best.pnlPercent) ? p : best)
          : null,
        worstPerformer: positions.length > 0
          ? positions.reduce((worst, p) => parseFloat(p.pnlPercent) < parseFloat(worst.pnlPercent) ? p : worst)
          : null
      }
    }
  }, [])

  const removeEntry = useCallback((id) => {
    const entries = getEntries().filter(e => e.id !== id)
    saveEntries(entries)
    return entries
  }, [])

  const clearAll = useCallback(() => {
    saveEntries([])
    return []
  }, [])

  return { addEntry, getEntries: getEntries_, calculatePortfolioPnL, removeEntry, clearAll }
}
