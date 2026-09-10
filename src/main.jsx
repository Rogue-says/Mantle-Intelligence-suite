import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useDefiLlama } from './hooks/useDefiLlama'
import { useMantle } from './hooks/useMantle'
import { useILCalculator } from './hooks/useILCalculator'
import './style.css'

function App() {
  const { fetchMantleYields } = useDefiLlama()
  const { getPortfolio } = useMantle()
  const { estimateILForPriceChange } = useILCalculator()
  const [tab, setTab] = useState('Yields'), [pools, setPools] = useState(null)
  const [holdings, setHoldings] = useState(null), [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [change, setChange] = useState(50), [apr, setApr] = useState(10), [days, setDays] = useState(30)
  const [scenario, setScenario] = useState(null)
  async function run(fn) { setBusy(true); setError(''); try { await fn() } catch (e) { setError(e.message) } finally { setBusy(false) } }
  return <main>
    <header><span className="eyebrow">MANTLE / RESEARCH TOOLS</span><h1>Intelligence Suite</h1><p>Explore yields, inspect balances, and compare liquidity scenarios.</p></header>
    <nav aria-label="Tools">{['Yields', 'Wallet', 'LP calculator'].map(t => <button key={t} aria-pressed={tab === t} onClick={() => { setTab(t); setError('') }}>{t}</button>)}</nav>
    {error && <p role="alert" className="error">{error}</p>}
    {tab === 'Yields' && <section><div className="heading"><div><h2>Mantle yield pools</h2><p>Top 15 by TVL. APY is variable and does not measure safety.</p></div><button disabled={busy} onClick={() => run(async () => setPools(await fetchMantleYields()))}>{busy ? 'Loading…' : 'Refresh yields'}</button></div>
      {pools === null ? <p className="empty">Refresh to load data from DefiLlama.</p> : pools.length === 0 ? <p>No matching pools were returned.</p> : <div className="table"><table><thead><tr><th>Protocol</th><th>Pool</th><th>APY</th><th>TVL</th></tr></thead><tbody>{pools.map(p => <tr key={p.pool}><td>{p.protocol}</td><td>{p.symbol}</td><td>{p.apy}%</td><td>{p.tvl}</td></tr>)}</tbody></table></div>}
    </section>}
    {tab === 'Wallet' && <section><h2>Wallet balances</h2><p>Read-only lookup of native MNT and six configured tokens. No wallet connection required.</p><form onSubmit={e => { e.preventDefault(); run(async () => { setHoldings(null); const data = await getPortfolio(address); if (!data) throw new Error('Could not load this wallet. Check the address and RPC connection.'); setHoldings(data) }) }}><label>Wallet address<input value={address} onChange={e => setAddress(e.target.value.trim())} required pattern="0x[0-9a-fA-F]{40}" placeholder="0x…" /></label><button disabled={busy}>{busy ? 'Loading…' : 'Read balances'}</button></form>
      {holdings && <div className="table"><table><thead><tr><th>Token</th><th>Balance</th></tr></thead><tbody>{holdings.map(h => <tr key={h.symbol}><td>{h.symbol}</td><td>{h.balance}</td></tr>)}</tbody></table></div>}<p className="note">These are token balances, not a complete DeFi position inventory.</p></section>}
    {tab === 'LP calculator' && <section><h2>Impermanent loss scenario</h2><p>Illustrative 50/50 constant-product pool. Compare fees against loss relative to holding; excludes gas and concentrated liquidity.</p><form onSubmit={e => { e.preventDefault(); run(() => setScenario(estimateILForPriceChange(Number(change), Number(apr), Number(days)))) }}><div className="inputs"><label>Relative price change (%)<input type="number" min="-99.99" step="any" required value={change} onChange={e => setChange(e.target.value)} /></label><label>Fee APR (%)<input type="number" min="0" step="any" required value={apr} onChange={e => setApr(e.target.value)} /></label><label>Days held<input type="number" min="0" step="1" required value={days} onChange={e => setDays(e.target.value)} /></label></div><button>Calculate</button></form>{scenario && <div className="metrics" aria-live="polite"><article><span>Impermanent loss</span><strong>{scenario.impermanentLoss}</strong></article><article><span>Estimated fee return</span><strong>{scenario.feeReturn}</strong></article><article><span>Fees minus IL estimate</span><strong>{scenario.netReturn}</strong></article><p>Break-even: {scenario.breakEvenDays === null ? 'Never at zero fee APR' : `${scenario.breakEvenDays} days under fixed assumptions`}</p></div>}</section>}
    <footer>Experimental research tools. This version does not provide an AI chat service or execute protocol trades.</footer>
  </main>
}
createRoot(document.getElementById('root')).render(<App />)
