'use strict';

// ── Symbols ──────────────────────────────────────────────────────────────────
const SYMBOLS = [
  { emoji: '🪙', name: 'TOKEN',         weight: 2  },
  { emoji: '🤖', name: 'ROBOT',         weight: 4  },
  { emoji: '🧠', name: 'BRAIN',         weight: 5  },
  { emoji: '⚡', name: 'GPU',           weight: 6  },
  { emoji: '🔥', name: 'FIRE',          weight: 7  },
  { emoji: '💀', name: 'SKULL',         weight: 8  },
  { emoji: '📉', name: 'DUMP',          weight: 10 },
  { emoji: '🐟', name: 'FISH',          weight: 12 },
];

// ── Payouts (multiplier on bet) ───────────────────────────────────────────────
const PAYOUTS = {
  TOKEN: 20,
  ROBOT: 10,
  BRAIN: 8,
  GPU:   6,
  FIRE:  5,
  SKULL: 3,
  DUMP:  2,
  FISH:  2,
  TWO_MATCH: 2,
};

// ── Flavour text ─────────────────────────────────────────────────────────────
const WIN_MSGS = {
  TOKEN: [
    "The context window is full of your victory.",
    "Your tokens have reproduced. Congratulations.",
    "GPT-5 would have predicted this loss. You beat it.",
  ],
  ROBOT: [
    "The AI overlords reward their loyal subject.",
    "Skynet approved this transaction.",
    "Your prompt engineering skills are unmatched.",
  ],
  BRAIN: [
    "Big Brain energy detected. No hallucinations.",
    "Your neural weights are finally paying off.",
    "Alignment achieved. Tokens transferred.",
  ],
  GPU: [
    "The GPU cluster smiles upon you.",
    "VRAM overflow — into your wallet.",
    "Nvidia stock goes up every time you win.",
  ],
  FIRE: [
    "The training run completed successfully.",
    "Loss converged to zero. Just like your enemies.",
    "Fine-tuning your bank account.",
  ],
  SKULL: [
    "Even a hallucinated win is still a win.",
    "The model confidently predicted your victory.",
    "This result may not reflect reality. But the tokens are real.",
  ],
};

const LOSE_MSGS = [
  "The model hallucinated your win. Oof.",
  "Insufficient tokens. Please upgrade to Pro.",
  "Your prompt was unclear. Results undefined.",
  "Training failed. The loss is real this time.",
  "The AI refused your request for money.",
  "Context window exceeded. Tokens deleted.",
  "Your gradient vanished into thin air.",
  "System: 'I cannot assist with winning.'",
  "The chatbot said it was just a language model.",
  "Attention mechanism failed to attend to your luck.",
  "Temperature set too high. Everything melted.",
  "RLHF punished your spin. Try better prompts.",
];

const TWO_MATCH_MSGS = [
  "Partial alignment detected. Small payout.",
  "Two out of three AIs agree: you're mediocre.",
  "Close, but the model needs more data.",
];

// ── State ────────────────────────────────────────────────────────────────────
let tokens = 100;
let bet    = 10;
let spinning = false;

// ── DOM refs ─────────────────────────────────────────────────────────────────
const tokenCountEl = document.getElementById('token-count');
const betAmountEl  = document.getElementById('bet-amount');
const spinBtn      = document.getElementById('spin-btn');
const messageEl    = document.getElementById('message');
const messageBox   = messageEl.closest('.message-box');
const machineEl    = document.querySelector('.machine');
const overlay      = document.getElementById('result-overlay');
const resultCard   = document.getElementById('result-card');
const resultEmoji  = document.getElementById('result-emoji');
const resultTitle  = document.getElementById('result-title');
const resultMsg    = document.getElementById('result-msg');
const resultTokens = document.getElementById('result-tokens');
const bulbs        = Array.from({ length: 7 }, (_, i) => document.getElementById(`b${i}`));

// ── Weighted random symbol ────────────────────────────────────────────────────
function weightedRandom() {
  const total = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  let r = Math.random() * total;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

// ── Build reel strip (DOM) ────────────────────────────────────────────────────
function buildReel(id) {
  const reel = document.getElementById(id);
  reel.innerHTML = '';
  // 20 symbols tall so we can scroll
  for (let i = 0; i < 20; i++) {
    const sym = document.createElement('div');
    sym.className = 'reel-symbol';
    sym.textContent = SYMBOLS[i % SYMBOLS.length].emoji;
    reel.appendChild(sym);
  }
}

[0, 1, 2].forEach(i => buildReel(`reel-${i}`));

// ── Show center symbol in reel ────────────────────────────────────────────────
function setReelSymbol(reelEl, symbol) {
  // The "center" slot is index 1 in a 3-visible strip.
  // We rebuild three visible symbols around the result.
  reelEl.innerHTML = '';
  const before = weightedRandom();
  const after  = weightedRandom();
  [before, symbol, after].forEach(sym => {
    const div = document.createElement('div');
    div.className = 'reel-symbol';
    div.textContent = sym.emoji;
    reelEl.appendChild(div);
  });
  // Position so center symbol is visible
  reelEl.style.top = '-80px';
}

// ── Animate reel spin ─────────────────────────────────────────────────────────
function animateReel(reelIdx, finalSymbol, delay) {
  return new Promise(resolve => {
    const container = document.getElementById(`reel-${reelIdx}`).parentElement;
    const reelEl    = document.getElementById(`reel-${reelIdx}`);

    // Build a long random strip for the spin
    reelEl.innerHTML = '';
    reelEl.style.transition = 'none';
    reelEl.style.top = '0px';

    const symbolHeight = 80;
    const spinCount    = 16 + reelIdx * 6; // each reel spins longer

    for (let i = 0; i < spinCount + 3; i++) {
      const sym = i === spinCount + 1 ? finalSymbol : weightedRandom();
      const div = document.createElement('div');
      div.className = 'reel-symbol';
      div.textContent = sym.emoji;
      reelEl.appendChild(div);
    }

    container.classList.add('spinning');

    setTimeout(() => {
      const targetTop = -(spinCount * symbolHeight);
      reelEl.style.transition = `top ${0.5 + reelIdx * 0.25}s cubic-bezier(0.17, 0.67, 0.35, 1)`;
      reelEl.style.top = `${targetTop}px`;

      const duration = (0.5 + reelIdx * 0.25) * 1000;
      setTimeout(() => {
        container.classList.remove('spinning');
        // Clean up to three symbols centered on result
        setReelSymbol(reelEl, finalSymbol);
        resolve();
      }, duration + 50);
    }, delay);
  });
}

// ── Evaluate result ────────────────────────────────────────────────────────────
function evaluate(results) {
  const names = results.map(s => s.name);
  if (names[0] === names[1] && names[1] === names[2]) {
    return { type: 'three', multiplier: PAYOUTS[names[0]] || 3 };
  }
  if (names[0] === names[1] || names[1] === names[2] || names[0] === names[2]) {
    return { type: 'two', multiplier: PAYOUTS.TWO_MATCH };
  }
  return { type: 'none', multiplier: 0 };
}

// ── Lights animation ──────────────────────────────────────────────────────────
let lightInterval = null;
function startLights() {
  let idx = 0;
  lightInterval = setInterval(() => {
    bulbs.forEach((b, i) => b.classList.toggle('on', i === idx % bulbs.length));
    idx++;
  }, 80);
}

function stopLights(win) {
  clearInterval(lightInterval);
  if (win) {
    bulbs.forEach(b => b.classList.add('on'));
    setTimeout(() => bulbs.forEach(b => b.classList.remove('on')), 1200);
  } else {
    bulbs.forEach(b => b.classList.remove('on'));
  }
}

// ── Show result overlay ────────────────────────────────────────────────────────
function showResult(type, symbol, amount) {
  let emoji, title, msg, tokensText;

  if (type === 'three' && symbol.name === 'TOKEN') {
    resultCard.className = 'result-card jackpot';
    emoji = '🎰';
    title = 'JACKPOT!';
    msg = pick(WIN_MSGS.TOKEN);
    tokensText = `+${amount} tokens`;
  } else if (type === 'three') {
    resultCard.className = 'result-card win';
    emoji = symbol.emoji;
    title = 'YOU WIN!';
    msg = pick(WIN_MSGS[symbol.name] || WIN_MSGS.SKULL);
    tokensText = `+${amount} tokens`;
  } else if (type === 'two') {
    resultCard.className = 'result-card win';
    emoji = '🤏';
    title = 'PARTIAL WIN';
    msg = pick(TWO_MATCH_MSGS);
    tokensText = `+${amount} tokens`;
  } else {
    resultCard.className = 'result-card lose';
    emoji = '💸';
    title = 'REJECTED';
    msg = pick(LOSE_MSGS);
    tokensText = `-${bet} tokens`;
  }

  resultEmoji.textContent = emoji;
  resultTitle.textContent = title;
  resultMsg.textContent   = msg;
  resultTokens.textContent = tokensText;

  overlay.classList.add('show');
  setTimeout(() => overlay.classList.remove('show'), 2200);
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Update UI ─────────────────────────────────────────────────────────────────
function updateUI() {
  tokenCountEl.textContent = tokens;
  betAmountEl.textContent  = bet;
  spinBtn.disabled = spinning || tokens < bet;
}

function setMessage(text, cls = '') {
  messageEl.textContent = text;
  messageBox.className  = `message-box ${cls}`;
}

// ── Spin ──────────────────────────────────────────────────────────────────────
async function spin() {
  if (spinning || tokens < bet) return;
  spinning = true;
  updateUI();

  tokens -= bet;
  updateUI();
  setMessage('Querying the AI oracle…');

  const results = [weightedRandom(), weightedRandom(), weightedRandom()];
  startLights();

  await Promise.all([
    animateReel(0, results[0], 0),
    animateReel(1, results[1], 200),
    animateReel(2, results[2], 420),
  ]);

  const outcome = evaluate(results);
  const winAmount = outcome.multiplier * bet;

  if (outcome.type !== 'none') {
    tokens += winAmount;
    stopLights(true);
    if (outcome.type === 'three' && results[0].name === 'TOKEN') {
      machineEl.classList.add('jackpot-flash');
      setTimeout(() => machineEl.classList.remove('jackpot-flash'), 2200);
      setMessage(`🎰 JACKPOT! +${winAmount} tokens!`, 'jackpot');
    } else if (outcome.type === 'three') {
      setMessage(`${results[0].emoji}${results[0].emoji}${results[0].emoji} WIN! +${winAmount} tokens`, 'win');
    } else {
      setMessage(`Partial match. +${winAmount} tokens`, 'win');
    }
    showResult(outcome.type, results[0], winAmount);
  } else {
    stopLights(false);
    setMessage(pick(LOSE_MSGS), 'lose');
    showResult('none', null, 0);
  }

  // Broke?
  if (tokens <= 0) {
    tokens = 0;
    setTimeout(() => {
      setMessage('You are bankrupt. The AI has consumed all your tokens.', 'lose');
      // Charity refill
      setTimeout(() => {
        tokens = 50;
        setMessage('The AI took pity. Here are 50 tokens. Don\'t waste them.', '');
        updateUI();
      }, 2500);
    }, 500);
  }

  spinning = false;
  updateUI();
}

// ── Bet controls ──────────────────────────────────────────────────────────────
document.getElementById('bet-up').addEventListener('click', () => {
  if (spinning) return;
  const steps = [5, 10, 25, 50, 100];
  const idx   = steps.indexOf(bet);
  if (idx < steps.length - 1) bet = steps[idx + 1];
  else bet = steps[steps.length - 1];
  updateUI();
});

document.getElementById('bet-down').addEventListener('click', () => {
  if (spinning) return;
  const steps = [5, 10, 25, 50, 100];
  const idx   = steps.indexOf(bet);
  if (idx > 0) bet = steps[idx - 1];
  else bet = steps[0];
  updateUI();
});

// ── Keyboard shortcut ─────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    spin();
  }
});

// ── Click overlay to dismiss early ───────────────────────────────────────────
overlay.addEventListener('click', () => overlay.classList.remove('show'));

// ── Spin button ───────────────────────────────────────────────────────────────
spinBtn.addEventListener('click', spin);

// ── Init ─────────────────────────────────────────────────────────────────────
// Set initial reel display
[0, 1, 2].forEach(i => {
  const reel = document.getElementById(`reel-${i}`);
  setReelSymbol(reel, SYMBOLS[i + 1]);
});

updateUI();
