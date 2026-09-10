# Mantle Intelligence Suite

A React application for exploring Mantle yield pools, reading wallet balances, and comparing liquidity-pool scenarios. This revision restores the missing application entrypoint and corrects calculation and transaction-building bugs.

## Run

Requires Node.js 22.12+ and npm.

```bash
git clone https://github.com/Rogue-says/Mantle-Intelligence-suite.git
cd Mantle-Intelligence-suite
npm ci
npm run dev
```

Open the URL printed by Vite. For a production bundle:

```bash
npm test
npm run build
npm run preview
```

Optionally copy `.env.example` to `.env` and set `VITE_ALCHEMY_RPC`. Browser-prefixed environment variables are public; do not put secret API keys in them.

## Available interface

| Tool | Behavior |
| --- | --- |
| Yields | Fetches the top 15 Mantle pools by TVL from DefiLlama; shows APY, protocol and TVL with loading/error states |
| Wallet | Reads native MNT and six configured ERC-20 balances from a supplied address |
| LP calculator | Estimates impermanent loss for an initially equal-value 50/50 constant-product pool and compares it with fixed fee assumptions |

The wallet view is read-only. It does not connect a signer or submit transactions. Token balances are not a full inventory of lending, staking or LP positions. External APIs and public RPCs may be unavailable or rate-limited.

## Reusable modules

- `useDefiLlama`: yields, browser-local history, changes and exploratory trends. Snapshots are bounded and spaced at least five minutes apart. Trend slopes use elapsed days rather than treating every refresh as a day.
- `useILCalculator`: 50/50 pool calculations. Dollar loss is measured against the current holding value. LP PnL subtracts the original investment, and zero fee APR has no finite break-even date. Positive prices and equal entry values are required for position calculations.
- `usePnL`: browser-local entries and mark-to-market calculations, including a valid zero current price. It does not discover cost basis from chain history.
- `useTxBuilder`: ABI-encoded ERC-20 approvals with an explicitly supplied token, spender and integer base-unit amount. It does not submit them. Placeholder protocol addresses have been removed; staking, lending and swap builders reject requests until verified adapters exist.
- `useRiskMonitor`: illustrative calculations from supplied collateral/debt. Protocol thresholds are assumptions, not live configuration. Live wallet position discovery now reports that it is unimplemented instead of inventing lending positions from a wallet's native-token balance.
- `useSimulation`: rough scenarios, not EVM simulation or executable quotes. LP scenarios require explicit USD prices for both tokens. Gas estimates use MNT; no fabricated dollar gas quote is returned.
- `src/prompts/systemPrompt.js`: an experimental prompt asset. There is no connected LLM backend or functional 12-mode chat interface in this repository.

Only Yields, Wallet and LP calculator are wired into the interface. Other hooks are available for further development.

## Limits of the calculations

APY is variable; a high yield is not a safety rating. IL calculations exclude concentrated liquidity, changing pool weights and trading costs. Fee APR and holding periods are assumptions. Fees-minus-IL percentages are a simplified comparison, not a total portfolio-return forecast. Multiple collateral assets and protocol-specific liquidation rules require verified on-chain adapters before live risk alerts can be trusted.

This project does not implement automated trading, leverage management, liquidation protection or contract security auditing. No live transaction or published deployment was performed during this repair.

## Tests

`npm test` checks a known 50/50 LP example, invalid price inputs, zero-APR break-even, a token price falling to zero, and exact approval calldata. `npm run build` verifies the application bundle. CI runs both. External API availability is not tested by the deterministic suite.

## Next development steps

Add verified protocol adapters and quotes before enabling transactions. A real AI assistant needs a server-side LLM integration and explicit data provenance. Do not present heuristic simulations or hardcoded protocol thresholds as verified financial guidance.

MIT license; see [LICENSE](LICENSE).
