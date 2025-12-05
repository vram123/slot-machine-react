import React from 'react'
import SlotMachine from './components/SlotMachine.jsx'

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>Vram's Slot Machine</h1>
        <p>Place a bet, spin the reels, and try your luck!</p>
      </header>
      <main className="container">
        <SlotMachine />
      </main>
      <footer className="footer">
        <p>Built with React + Vite</p>
      </footer>
    </div>
  )
}
