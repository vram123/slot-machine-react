# 🎰 React Slot Machine (Vite)

A simple, clean **React + Vite** project for a slot machine game — great for learning state, events, and UI updates.

## ✨ Features
- 3 reels with emoji symbols
- Weighted probabilities per symbol
- Two-of-a-kind and three-of-a-kind payouts
- Balance, bet input, reset
- Simple animation for spinning

## 🚀 Quick Start
```bash
# 1) Unzip
unzip slot-machine-react.zip
cd slot-machine-react

# 2) Install deps
npm install

# 3) Run dev
npm run dev
```

Then open the local URL that Vite prints (usually http://localhost:5173).

## 🧮 Payouts
Each symbol has a weight (rarity) and payouts for two or three of a kind. You can tweak these in `src/components/SlotMachine.jsx`.

## 🧩 Customize
- Change symbols / weights / payouts
- Add sound effects
- Persist balance in localStorage
- Add a 5-reel mode or multiplier wilds
