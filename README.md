# Mantle Intelligence Suite

> Your personal AI-powered DeFi advisor for Mantle network built for the Mantle Squad Bounty 2026.

Mantle Intelligence Suite is a conversational AI agent that knows Mantle's entire ecosystem. Instead of jumping between DefiLlama, the Mantle Explorer, and five other sites, you just talk to it. It fetches live data, does the math, and gives you direct answers not just information.

It only works with Mantle. No other chains. No guessing.

---

## What it does

The agent runs in 12 modes. You never pick a mode manually, it detects what you need from what you say.

### Core modes

| Mode | What you say | What it does |
|------|-------------|--------------|
| **Yield** | "best APR on Mantle" | Fetches live DefiLlama data, ranks by risk, outputs yield cards |
| **Portfolio** | Paste 0x address | Reads all token balances via Mantle RPC, risk assessment, rebalancing |
| **Strategy** | "I have $5k, medium risk" | Builds allocation plan with percentages, entry steps, rebalancing triggers |
| **Radar** | "what happened today" | TVL movements, APR changes, ecosystem briefings |
| **Inspector** | Paste contract address | SAFE / CAUTION / AVOID verdict via Mantle Explorer |
| **Governance** | "explain proposal X" | Plain English for MNT holders and mETH holders |

### Advanced modes

| Mode | What you say | What it does |
|------|-------------|--------------|
| **Simulate** | "what if I swap 1000 USDT" | Preview output, slippage, gas cost, risk score before executing |
| **Risk** | "am I safe on Aave" | Health factor, liquidation price, max drawdown to liquidation |
| **PnL** | "how am I doing" | Unrealized gains, fees earned, win rate, best/worst performers |
| **IL** | "should I LP or just hold" | Impermanent loss calc, LP vs hold comparison, break-even days |
| **Execute** | "build the tx" | Raw calldata for stake/deposit/swap — you review and sign |
| **Alert** | "warn me if APR drops below 3%" | Set thresholds for monitoring changes |

---

## Setup your AI agent

**Step 1 — Clone and install**

```bash
https://github.com/Rogue-says/Mantle-Intelligence-suite.git

cd mantle-intelligence-suite

npm install
```

This gives your agent access to `ethers.js` for reading Mantle RPC and all the hook modules for data fetching.

**Step 2 — Copy the system prompt**

Open `src/prompts/systemPrompt.js` and copy the full prompt string.

**Step 3 — Create a new agent**

Go to your workspace and create a new agent.

**Step 4 — Paste the system prompt**

Paste into the agent instructions field. This gives your agent all 12 modes.

**Step 5 — Add allowed data sources**

Add these URLs in your Agent tool config:

```
https://yields.llama.fi/pools
https://api.llama.fi/v2/chains
https://api.llama.fi/chart/
https://rpc.mantle.xyz
https://explorer.mantle.xyz/api
https://snapshot.org/#/mantle.eth
```

All free, no API keys required.

**Step 6 — Test**

Ask: `what is the best yield on Mantle right now?`

The agent fetches live data and responds with ranked recommendations.

---

## Safety built in

- Never touches other chains
- Simulates before recommending execution
- Calculates IL before recommending LP positions
- Checks health factor before suggesting leverage or borrowing
- Flags APR decay (>30% drop = emission decay warning)
- Never auto-signs — always gives you calldata to review manually
- Warns about unsustainable APRs on new protocols (<2 weeks old, >50% APR)

---

## Protocols the agent knows

| Protocol | Type | Risk |
|----------|------|------|
| mETH Protocol | Liquid ETH staking | Low |
| cmETH | Restaked mETH | Low-Medium |
| FBTC | Bitcoin on Mantle | Low-Medium |
| Agni Finance | DEX + liquidity pools | Medium |
| Merchant Moe | Mantle-native DEX | Medium |
| Aurelius | Lending and borrowing | Medium |
| Lendle | Lending protocol | Medium |
| Aave (Mantle) | Lending | Low-Medium |
| Mantle Vault | CeFi-linked yield | Medium |

---

## How it works

```
You type a question
        ↓
Agent detects mode from your message
        ↓
Fetches live data from the right API
        ↓
Does the math (simulation, IL, health factor, PnL)
        ↓
Returns a direct answer with cards, risk levels,
and plain English explanations
```

---

## APIs and tools

All free. No paid services required.

| API | URL | Used for | Free | Key needed |
|-----|-----|----------|------|------------|
| DefiLlama | `https://yields.llama.fi/pools` | Live APR + TVL | Yes | No |
| DefiLlama | `https://api.llama.fi/v2/chains` | Mantle total TVL + 24h change | Yes | No |
| DefiLlama | `https://api.llama.fi/chart/{pool}` | Historical yields for delta/decay tracking | Yes | No |
| Mantle RPC | `https://rpc.mantle.xyz` | Wallet balances, token holdings | Yes | No |
| Mantle Explorer | `https://explorer.mantle.xyz/api` | Contract verification, source code | Yes | No |
| Snapshot | `https://snapshot.org/#/mantle.eth` | Governance proposals | Yes | No |
| Alchemy (optional) | `https://mantle-mainnet.g.alchemy.com/v2/{key}` | Faster RPC | Free tier | Yes |

Alchemy is optional — the agent falls back to the public Mantle RPC automatically.

---

## Tech stack

- React + Vite (for local development)
- ethers.js for Mantle RPC reads
- DefiLlama public API for yields and TVL
- Snapshot API for governance
- Powered by OpenClaw agent (Claude-based)

---

## Project structure

```
mantle-intelligence-suite/
├── .env.example
├── .gitignore
├── README.md
└── src/
    ├── hooks/
    │   ├── useDefiLlama.js       live yield/TVL fetching + delta tracking + anomaly detection
    │   ├── useMantle.js          wallet reads and contract inspection
    │   ├── useSimulation.js      tx simulation (swap, deposit, LP) with risk scoring
    │   ├── useRiskMonitor.js     health factor, liquidation price, drawdown calculator
    │   ├── usePnL.js             position tracking, unrealized PnL, win rate
    │   ├── useILCalculator.js    impermanent loss calc, LP vs hold comparison
    │   └── useTxBuilder.js       calldata builder for stake/deposit/swap/withdraw
    └── prompts/
        └── systemPrompt.js       full agent brain with all 12 modes
```

---

## Example queries

```
"what's the best yield right now"
"analyze 0x1234...abcd"
"I have $10k, low risk, 6 month horizon"
"what happened on Mantle today"
"is 0x5678...efgh a safe contract"
"what if I swap 500 USDT for mETH"
"am I safe borrowing on Aave"
"how's my portfolio doing"
"should I LP mETH/USDT or just hold"
"build a tx to stake 1 mETH"
"alert me if cmETH APR drops below 3%"
"explain the latest DAO proposal"
```

---

## Built for

Mantle Squad Bounty, When AI Meets Mantle — March 2026

Not financial advice. Yield data from DefiLlama. Mantle network only.

---

**Disclaimer:** This tool is for informational purposes only. Nothing here is financial advice. Always do your own research before deploying capital on any DeFi protocol.
