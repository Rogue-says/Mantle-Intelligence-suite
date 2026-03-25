import { useCallback } from 'react'

const STORAGE_KEY = 'mantle_yield_history'

function getYieldHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveYieldHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch (e) {
    console.warn('Failed to save yield history:', e)
  }
}

function recordSnapshot(currentYields) {
  const history = getYieldHistory()
  const timestamp = new Date().toISOString()

  currentYields.forEach(pool => {
    if (!history[pool.pool]) {
      history[pool.pool] = []
    }
    history[pool.pool].push({
      timestamp,
      apy: pool.apy,
      tvl: pool.tvlUsd
    })

    if (history[pool.pool].length > 100) {
      history[pool.pool] = history[pool.pool].slice(-100)
    }
  })

  saveYieldHistory(history)
  return history
}

function calculateDelta(current, previous) {
  if (!previous) return null
  const currentApy = parseFloat(current.apy)
  const previousApy = parseFloat(previous.apy)
  const delta = currentApy - previousApy
  const deltaPercent = previousApy !== 0 ? (delta / previousApy * 100) : 0

  return {
    delta: delta.toFixed(2) + '%',
    deltaPercent: deltaPercent.toFixed(1) + '%',
    direction: delta > 0 ? 'UP' : delta < 0 ? 'DOWN' : 'FLAT',
    previousApy: previousApy.toFixed(2) + '%',
    currentApy: currentApy.toFixed(2) + '%'
  }
}

function detectAnomalies(currentYields, history) {
  const anomalies = []

  currentYields.forEach(pool => {
    const poolHistory = history[pool.pool]
    if (!poolHistory || poolHistory.length < 2) return

    const currentApy = parseFloat(pool.apy)
    const recentSnapshots = poolHistory.slice(-10)
    const avgApy = recentSnapshots.reduce((sum, s) => sum + parseFloat(s.apy), 0) / recentSnapshots.length
    const stdDev = Math.sqrt(
      recentSnapshots.reduce((sum, s) => sum + Math.pow(parseFloat(s.apy) - avgApy, 2), 0) / recentSnapshots.length
    )

    const zScore = stdDev > 0 ? (currentApy - avgApy) / stdDev : 0

    if (Math.abs(zScore) > 2) {
      anomalies.push({
        protocol: pool.protocol,
        symbol: pool.symbol,
        currentApy: pool.apy,
        averageApy: avgApy.toFixed(2) + '%',
        zScore: zScore.toFixed(2),
        type: zScore > 0 ? 'SPIKE' : 'DROP',
        severity: Math.abs(zScore) > 3 ? 'HIGH' : 'MEDIUM'
      })
    }

    if (recentSnapshots.length >= 2) {
      const oldest = parseFloat(recentSnapshots[0].apy)
      const decayRate = (oldest - currentApy) / oldest * 100
      if (decayRate > 30) {
        anomalies.push({
          protocol: pool.protocol,
          symbol: pool.symbol,
          currentApy: pool.apy,
          initialApy: oldest.toFixed(2) + '%',
          decayRate: decayRate.toFixed(1) + '%',
          type: 'APR_DECAY',
          severity: decayRate > 60 ? 'HIGH' : 'MEDIUM',
          warning: `APR dropped ${decayRate.toFixed(0)}% from initial — likely emission decay`
        })
      }
    }
  })

  return anomalies
}

function predictAprDecay(poolHistory, daysAhead = 30) {
  if (!poolHistory || poolHistory.length < 5) return null

  const recent = poolHistory.slice(-20)
  const apys = recent.map(s => parseFloat(s.apy))

  const n = apys.length
  const xMean = (n - 1) / 2
  const yMean = apys.reduce((a, b) => a + b, 0) / n

  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (apys[i] - yMean)
    denominator += (i - xMean) * (i - xMean)
  }

  const slope = denominator !== 0 ? numerator / denominator : 0
  const intercept = yMean - slope * xMean

  const predicted = intercept + slope * (n + daysAhead)

  return {
    currentApy: apys[n - 1].toFixed(2) + '%',
    predictedApy: Math.max(0, predicted).toFixed(2) + '%',
    trend: slope < -0.01 ? 'DECLINING' : slope > 0.01 ? 'RISING' : 'STABLE',
    dailyDecayRate: (slope * -1).toFixed(4) + '%',
    daysUntilBelow3Percent: slope < 0 ? Math.max(0, Math.floor((3 - apys[n - 1]) / slope)) : null
  }
}

export function useDefiLlama() {
  const fetchMantleYields = useCallback(async () => {
    try {
      const res = await fetch('https://yields.llama.fi/pools')
      const { data } = await res.json()
      const yields = data
        .filter(p => p.chain === 'Mantle' && p.apy > 0)
        .sort((a, b) => b.tvlUsd - a.tvlUsd)
        .slice(0, 15)
        .map(p => ({
          protocol: p.project,
          symbol: p.symbol,
          apy: parseFloat(p.apy).toFixed(2),
          tvl: p.tvlUsd ? '$' + (p.tvlUsd / 1e6).toFixed(1) + 'M' : 'N/A',
          tvlUsd: p.tvlUsd,
          pool: p.pool
        }))

      recordSnapshot(yields)

      return yields
    } catch (e) {
      console.warn('Failed to fetch Mantle yields:', e)
      return []
    }
  }, [])

  const fetchMantleTVL = useCallback(async () => {
    try {
      const res = await fetch('https://api.llama.fi/v2/chains')
      const data = await res.json()
      const mantle = data.find(c => c.name === 'Mantle')
      return mantle ? {
        tvl: '$' + (mantle.tvl / 1e9).toFixed(2) + 'B',
        change24h: mantle.change_1d != null ? mantle.change_1d.toFixed(2) + '%' : 'N/A'
      } : null
    } catch (e) {
      console.warn('Failed to fetch Mantle TVL:', e)
      return null
    }
  }, [])

  const getYieldDeltas = useCallback(() => {
    const history = getYieldHistory()
    const poolIds = Object.keys(history)
    const deltas = {}

    poolIds.forEach(poolId => {
      const snapshots = history[poolId]
      if (snapshots.length < 2) return

      const current = snapshots[snapshots.length - 1]
      const previous = snapshots[snapshots.length - 2]
      const weekAgo = snapshots.find(s => {
        const age = (new Date() - new Date(s.timestamp)) / (1000 * 60 * 60 * 24)
        return age >= 6 && age <= 8
      })

      deltas[poolId] = {
        lastChange: calculateDelta(current, previous),
        weeklyChange: weekAgo ? calculateDelta(current, weekAgo) : null
      }
    })

    return deltas
  }, [])

  const getAnomalies = useCallback(async () => {
    const yields = await fetchMantleYields()
    const history = getYieldHistory()
    return detectAnomalies(yields, history)
  }, [fetchMantleYields])

  const getAprPredictions = useCallback((poolId) => {
    const history = getYieldHistory()
    return predictAprDecay(history[poolId])
  }, [])

  return { fetchMantleYields, fetchMantleTVL, getYieldDeltas, getAnomalies, getAprPredictions }
}
