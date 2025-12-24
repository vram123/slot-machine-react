import React, { useEffect, useMemo, useState } from "react";

//  global audio objects (served from /public/sounds)
const spinSound = new Audio("/sounds/spin.wav");
const jackpotSound = new Audio("/sounds/jackpot.wav");

const JACKPOT_SEED = 1262132.28;

const SYMBOLS = [
  { icon: "🍒", name: "Cherry", weight: 120, payout3: 5, payout2: 0 },
  { icon: "🍋", name: "Lemon", weight: 120, payout3: 5, payout2: 0 },
  { icon: "🔔", name: "Bell", weight: 90, payout3: 8, payout2: 1 },
  { icon: "🍀", name: "Clover", weight: 60, payout3: 12, payout2: 2 },
  { icon: "💎", name: "Diamond", weight: 30, payout3: 20, payout2: 8 },
  { icon: "7️⃣", name: "7", weight: 9, payout3: "jackpot", payout2: 80 },
];

// format the jackpot like real casino signs
const formatCurrency = (value) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

// build a weighted "bag" of symbols
function weightedBag(symbols) {
  const bag = [];
  for (const s of symbols) {
    for (let i = 0; i < s.weight; i++) bag.push(s);
  }
  return bag;
}

export default function SlotMachine() {
  const bag = useMemo(() => weightedBag(SYMBOLS), []);

  const [balance, setBalance] = useState(100);
  const [bet, setBet] = useState(5);
  const [reels, setReels] = useState(["🍒", "🍋", "🔔"]);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { kind, amount, text, mult }
  const [jackpot, setJackpot] = useState(JACKPOT_SEED); // progressive jackpot

  // ✅ Auto-spin state (only adds requested behavior)
  const [autoSpin, setAutoSpin] = useState(false);

  function spinOnce() {
    return [
      bag[Math.floor(Math.random() * bag.length)],
      bag[Math.floor(Math.random() * bag.length)],
      bag[Math.floor(Math.random() * bag.length)],
    ];
  }

  // compute payout; also flag if 3x7 jackpot is hit
  function settlePayout(draw, bet, currentJackpot) {
    const [a, b, c] = draw.map((d) => d.icon);
    const [sa, sb, sc] = draw;
    let payoutMult = 0;
    let label = "You lost.";
    let delta = -bet;
    let jackpotHit = false;

    // 3x 7's → JACKPOT
    if (a === "7️⃣" && b === "7️⃣" && c === "7️⃣") {
      delta = currentJackpot; // win the whole jackpot
      jackpotHit = true;
      label = `JACKPOT!!! 7️⃣7️⃣7️⃣ +${formatCurrency(currentJackpot)}`;
      return { delta, label, mult: null, jackpotHit };
    }

    // Normal 3-of-a-kind
    if (a === b && b === c) {
      payoutMult = sa.payout3;
      label = `Triple ${sa.name}! x${payoutMult}`;
    } else if (a === b || b === c || a === c) {
      // two-of-a-kind payout
      const matched = a === b ? sa : b === c ? sb : sa === sc ? sa : sb;
      payoutMult = matched.payout2;
      label = `Two ${matched.name}s! x${payoutMult}`;
    }

    delta = payoutMult > 0 ? bet * payoutMult : -bet;
    return { delta, label, mult: payoutMult, jackpotHit };
  }

  async function handleSpin() {
    if (busy || bet <= 0) return;

    if (bet > balance) {
      setLastResult({
        kind: "warn",
        amount: 0,
        text: "Bet exceeds balance.",
        mult: null,
      });
      return;
    }

    setBusy(true);
    setLastResult(null);

    // 🔊 play spin sound at the start of a spin
    try {
      spinSound.currentTime = 0;
      spinSound.volume = 0.6;
      spinSound.play().catch(() => {});
    } catch {
      // ignore autoplay errors
    }

    // Decide the final outcome *first* so animation can tease it
    const finalDraw = spinOnce();
    const [s0, s1, s2] = finalDraw;

    const isSevenJackpot =
      s0.icon === "7️⃣" && s1.icon === "7️⃣" && s2.icon === "7️⃣";

    // Quick global spin animation for all three reels
    const t0 = performance.now();
    while (performance.now() - t0 < 400) {
      const draw = spinOnce();
      setReels(draw.map((d) => d.icon));
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 80));
    }

    if (isSevenJackpot) {
      // 🎯 JACKPOT ANIMATION for 777
      // 1) Lock the first two reels on final symbols
      setReels([
        s0.icon,
        s1.icon,
        bag[Math.floor(Math.random() * bag.length)].icon, // third still random
      ]);

      // 2) Tease third reel, slowing down
      const steps = 7;
      for (let i = 0; i < steps; i++) {
        const randomSymbol = bag[Math.floor(Math.random() * bag.length)].icon;
        setReels([s0.icon, s1.icon, randomSymbol]);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 120 + i * 40));
      }

      // 3) Land on the actual winning symbol
      setReels([s0.icon, s1.icon, s2.icon]);
    } else {
      // Normal stop
      setReels(finalDraw.map((d) => d.icon));
    }

    // Payout based on final draw
    const currentJackpot = jackpot;
    const { delta, label, mult, jackpotHit } = settlePayout(
      finalDraw,
      bet,
      currentJackpot
    );

    setBalance((b) => Math.max(0, b + delta));
    setLastResult({
      kind: delta >= 0 ? "win" : "lose",
      amount: Math.abs(delta),
      text: label,
      mult,
    });

    // 🔊 win sound rules (ONLY changed per your request):
    // - always plays if 3x7 jackpot
    // - plays if the user gets 2 or more diamonds
    // - plays if the user gets 3 clovers
    // - plays if the user gets 3 bells
    const icons = finalDraw.map((d) => d.icon);
    const diamonds = icons.filter((i) => i === "💎").length;
    const clovers = icons.filter((i) => i === "🍀").length;
    const bells = icons.filter((i) => i === "🔔").length;

    const playJackpotSfx = jackpotHit || diamonds >= 2 || clovers === 3 || bells === 3;

    if (playJackpotSfx) {
      try {
        jackpotSound.currentTime = 0;
        jackpotSound.volume = 1.0;
        jackpotSound.play().catch(() => {});
      } catch {
        // ignore
      }
    }

    // Update jackpot:
    // - if 777 hit → reset to seed
    // - else → grow progressively
    setJackpot((j) => {
      if (jackpotHit) return JACKPOT_SEED;
      const increment = bet * (Math.random() * 0.4 + 0.1); // 0.1–0.5×bet
      return j + increment;
    });

    setBusy(false);
  }

  useEffect(() => {
    if (!autoSpin) return;
  
    let cancelled = false;
  
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  
    const loop = async () => {
      while (!cancelled) {
        // stop if broke
        if (balance <= 0) {
          setAutoSpin(false);
          break;
        }
        await sleep(3000); 
        if (!busy) {
          await handleSpin();      // do one full spin
          await sleep(3000);
          
        } else {
          await sleep(3000);        // ✅ important: prevents tight-loop freezing
        }
      }
    };
    
    loop();
  
    return () => {
      cancelled = true;
    };
  }, [autoSpin, balance, busy]);
  
  function reset() {
    // ✅ if user resets while auto-spin is on, stop it
    setAutoSpin(false);
    setBalance(100);
    setBet(5);
    setLastResult(null);
  }

  return (
    <div className="machine-shell">
      {/* label sitting on the big CSS wheel */}
      <div className="machine-arch-label">VRAM's SLOTS</div>

      <div className="card">
        {/* JACKPOT + balance */}
        <div className="machine-top-row">
          <div className="jackpot-display">
            <span className="jackpot-label">JACKPOT</span>
            <span className="jackpot-amount">{formatCurrency(jackpot)}</span>
          </div>
          <div className="machine-balance">
            <span>Balance: ${balance}</span>
            <span>Last bet: ${bet}</span>
          </div>
        </div>

        {/* REELS under jackpot */}
        <div className="reels">
          {reels.map((icon, i) => (
            <div key={i} className="reel shadow-inset spin">
              {icon}
            </div>
          ))}
        </div>

        {/* CONTROL PANEL under the reels */}
        <div className="panel">
          <div className="group group-bet">
            <label htmlFor="bet">Bet</label>
            <input
              id="bet"
              type="number"
              min={1}
              step={1}
              value={bet}
              onChange={(e) =>
                setBet(Math.max(1, parseInt(e.target.value || "1", 10)))
              }
            />

            <div className="bet-buttons">
              {[1, 5, 10, 25, 50, 100].map((amount) => (
                <button
                  key={amount}
                  className="ghost small"
                  onClick={() => setBet(amount)}
                  disabled={busy || balance < amount}
                >
                  ${amount}
                </button>
              ))}
              <button
                className="ghost small"
                onClick={() => setBet(balance)}
                disabled={busy || balance <= 0}
              >
                All In
              </button>
            </div>
          </div>

          <div className="group group-actions">
            <button
              className="btn-spin"
              onClick={handleSpin}
              disabled={busy || balance <= 0}
            >
              Spin
            </button>

            {/* ✅ Auto Spin button added next to existing buttons (no layout redesign) */}
            <button
              className="ghost btn-reset"
              onClick={() => setAutoSpin((v) => !v)}
              disabled={balance <= 0}
              title="Auto Spin"
            >
              {autoSpin ? "Stop Auto" : "Auto Spin"}
            </button>

            <button className="ghost btn-reset" onClick={reset} disabled={busy}>
              Reset
            </button>
          </div>
        </div>

        {/* Result row */}
        {lastResult && (
          <div className="row">
            <div
              className={
                lastResult.kind === "win"
                  ? "result-text success"
                  : lastResult.kind === "warn"
                  ? "result-text muted"
                  : "result-text danger"
              }
            >
              {lastResult.text} {lastResult.mult ? `(±$${lastResult.amount})` : ""}
            </div>
            <div className="muted tip-text"></div>
          </div>
        )}

        {/* Paytable */}
        <div className="jackpot-guide">
          <strong>Winning Strikes</strong>
          <ul>
            <li>7️⃣7️⃣7️⃣ = JACKPOT</li>
            <li>💎💎💎 = ×20</li>
            <li>🍀🍀🍀 = ×12</li>
            <li>🔔🔔🔔 = ×8</li>
            <li>🍒🍒🍒 = ×5</li>
            <li>🍋🍋🍋 = ×5</li>
          </ul>
        </div>

        <div className="stats">
          {SYMBOLS.map((s) => (
            <div key={s.name} className="stat">
              <span className="stat-icon">{s.icon}</span>
              <span className="stat-label">
                {s.name}: 3x = {s.payout3}× bet, 2x = {s.payout2}× bet
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* cabinet base */}
      <div className="machine-base" />
    </div>
  );
}
