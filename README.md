# 🚀 Ultra Grid Trade

Automated Grid Trading Bot on Sui Network — NFT-gated, powered by Aftermath Finance & 7K Aggregator.

---

## 📁 Project Structure

```
ultra-grid-trade/
├── src/
│   ├── lib/
│   │   ├── constants.js      ← Token contracts, NFT ID, APR calc
│   │   ├── suiClient.js      ← Sui RPC connection + NFT verification
│   │   ├── aftermath.js      ← Aftermath Finance SDK (swap + prices)
│   │   ├── sevenK.js         ← 7K Aggregator SDK (swap + prices)
│   │   └── gridEngine.js     ← Core grid bot logic
│   ├── hooks/
│   │   ├── useGridBot.js     ← React hook: bot lifecycle
│   │   ├── useNFT.js         ← React hook: NFT ownership check
│   │   └── usePrices.js      ← React hook: live price feed
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── UI.jsx            ← Reusable components (Card, Button, etc.)
│   │   ├── BotConfigPanel.jsx
│   │   ├── PriceChart.jsx
│   │   ├── GridVisual.jsx
│   │   ├── TradeHistory.jsx
│   │   └── BottomBar.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── DashboardPage.jsx
│   │   └── AccountPage.jsx
│   ├── styles/global.css
│   ├── App.jsx
│   └── main.jsx              ← Entry point with Sui providers
├── index.html
├── vite.config.js
├── package.json
└── vercel.json
```

---

## 🛠️ Setup (Step by Step)

### Step 1 — Install Node.js
Download from https://nodejs.org (choose LTS version)

### Step 2 — Install dependencies
Open your terminal, navigate to this folder, and run:
```bash
npm install
```

### Step 3 — Run locally (for testing)
```bash
npm run dev
```
Open http://localhost:5173 in your browser.

### Step 4 — Build for production
```bash
npm run build
```
This creates a `dist/` folder ready to upload.

---

## 🌐 Deploy to Vercel (Free Hosting)

1. Create account at https://vercel.com
2. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
3. In this folder, run:
   ```bash
   vercel
   ```
4. Follow the prompts (press Enter for all defaults)
5. Your site will be live at `https://ultra-grid-trade.vercel.app`

---

## ⚙️ Configuration

All token contracts and the NFT collection ID are in `src/lib/constants.js`.

To update your NFT collection:
```js
export const NFT_PACKAGE_ID = '0xYOUR_PACKAGE_ID_HERE'
```

---

## 🔒 Security Notes

- The bot uses **delegated signing** — every trade shows a wallet popup for user approval
- The bot NEVER stores private keys
- Funds stay in the user's wallet at all times
- Only transactions built by Aftermath or 7K SDK are presented for signing

---

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `@mysten/sui` | Sui blockchain SDK |
| `@mysten/dapp-kit` | Wallet connection UI + hooks |
| `aftermath-ts-sdk` | Aftermath Finance DEX |
| `@7kprotocol/sdk-ts` | 7K Aggregator |
| `recharts` | Price charts |
| `@tanstack/react-query` | Async state (required by dapp-kit) |
