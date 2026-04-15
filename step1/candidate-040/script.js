'use strict';

// ── Symbols ──────────────────────────────────────────────────────────────────
const SYMBOLS = [
  { emoji: '💀', name: 'deprecated',   weight: 1  },
  { emoji: '🧠', name: 'brain',        weight: 4  },
  { emoji: '⚡', name: 'gpu',          weight: 6  },
  { emoji: '💬', name: 'prompt',       weight: 9  },
  { emoji: '🤖', name: 'robot',        weight: 11 },
  { emoji: '🔥', name: 'fire',         weight: 13 },
  { emoji: '💸', name: 'broke',        weight: 5  },
];

// Build weighted pool
const POOL = SYMBOLS.flatMap(s => Array(s.weight).fill(s));

// ── Payouts (multiplier on bet) ───────────────────────────────────────────────
const THREE_OF_A_KIND = {
  deprecated:  500,
  brain:       100,
  gpu:          50,
  prompt:       25,
  robot:        15,
  fire:         10,
  broke:        -3,   // penalty: lose 3× bet
};

// ── Flavour text ─────────────────────────────────────────────────────────────
const MESSAGES = {
  idle: [
    'Insert tokens to begin inference...',
    'The model is ready. Your wallet may not be.',
    'Each spin costs tokens. Just like every API call.',
    'Pro tip: the house uses GPT-4o to predict your losses.',
    'Spinning the reels burns approximately 0.003 kWh. You\'re welcome, planet.',
    'Terms & conditions: hallucinations may occur during winning sequences.',
    'Reminder: past performance is not indicative of future token burns.',
  ],
  win_small: [
    'Two tokens matched! A minor miracle in a stochastic universe.',
    'Context recall successful. Please don\'t ask follow-up questions.',
    'Partial match detected. The attention head is very pleased.',
    'Two-out-of-three ain\'t bad… unless you\'re a language model.',
    'A small win. The CEO has noted your loyalty.',
  ],
  win_big: [
    'TRIPLE MATCH! Sampled the perfect token three times in a row!',
    'You\'ve achieved alignment! (Financial alignment, not safety alignment.)',
    'The model confidently predicted this win with 97% certainty (post-hoc).',
    'Your prompt engineering is paying off literally.',
    'Reward model says: 5 out of 5 stars.',
  ],
  jackpot: [
    '💀 MODEL DEPRECATED JACKPOT! The old API key finally pays off!',
    'You win! Unfortunately, this model is being sunset next Tuesday.',
    'JACKPOT! Your tokens are safe. Your data… less so.',
    'The deprecated model smiles upon you from the great data center in the sky.',
  ],
  lose_small: [
    'No match. Your tokens have been successfully burned for compute.',
    'Inference complete. Result: you lose. Confidence: 99.9%.',
    'The attention mechanism attended to your money. Goodbye, money.',
    'Another spin, another carbon footprint, no reward.',
    'The model has hallucinated a win for you. Unfortunately this is reality.',
    'Token burn successful. The board of directors thanks you.',
  ],
  lose_big: [
    '💸💸💸 RATE LIMITED! You\'ve been throttled, refunded nothing, charged triple.',
    'Three dollar signs. The API pricing page sends its regards.',
    'You\'ve been rate limited harder than a free-tier OpenAI account.',
  ],
  broke: [
    'Out of tokens. Have you considered a subscription plan?',
    'Insufficient funds. Please attach a credit card to continue.',
    'Token balance: 0. This is fine. Everything is fine.',
  ],
};

function pickMessage(category) {
  const list = MESSAGES[category];
  return list[Math.floor(Math.random() * list.length)];
}

// ── State ─────────────────────────────────────────────────────────────────────
let tokens    = 100;
let bet       = 10;
let spinning  = false;

const BET_MIN  = 5;
const BET_MAX  = 50;
const BET_STEP = 5;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const tokenDisplay  = document.getElementById('token-count');
const betDisplay    = document.getElementById('bet-amount');
const spinBtn       = document.getElementById('spin-btn');
const betDown       = document.getElementById('bet-down');
const betUp         = document.getElementById('bet-up');
const maxBetBtn     = document.getElementById('max-bet');
const resultBanner  = document.getElementById('result-banner');
const resultText    = document.getElementById('result-text');
const messageText   = document.getElementById('message-text');
const reels         = [
  document.getElementById('reel-0'),
  document.getElementById('reel-1'),
  document.getElementById('reel-2'),
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function randSymbol() {
  return POOL[Math.floor(Math.random() * POOL.length)];
}

function setMessage(text) {
  messageText.textContent = text;
}

function updateTokenDisplay(bump = false) {
  tokenDisplay.textContent = tokens;
  if (bump) {
    tokenDisplay.classList.remove('token-bump');
    void tokenDisplay.offsetWidth; // reflow
    tokenDisplay.classList.add('token-bump');
  }
}

function showResult(text, type) {
  resultBanner.className = `result-banner ${type}`;
  resultText.textContent = text;
  if (type === 'win' || type === 'jackpot') {
    resultBanner.classList.add('flash-win');
  }
}

function hideResult() {
  resultBanner.className = 'result-banner hidden';
}

function updateBetDisplay() {
  betDisplay.textContent = bet;
}

function setSpinEnabled(val) {
  spinBtn.disabled = !val;
  betDown.disabled = !val;
  betUp.disabled   = !val;
  maxBetBtn.disabled = !val;
}

// ── Reel spin animation ───────────────────────────────────────────────────────
function spinReel(reelEl, finalSymbol, delay) {
  return new Promise(resolve => {
    setTimeout(() => {
      reelEl.classList.add('spinning');

      setTimeout(() => {
        reelEl.classList.remove('spinning');
        reelEl.querySelector('.symbol').textContent = finalSymbol.emoji;
        reelEl.style.filter = '';

        // tiny bounce
        reelEl.style.transform = 'scale(1.08)';
        setTimeout(() => { reelEl.style.transform = ''; }, 120);

        resolve(finalSymbol);
      }, 600 + delay * 220);

    }, delay * 80);
  });
}

// ── Core spin logic ───────────────────────────────────────────────────────────
async function doSpin() {
  if (spinning) return;
  if (tokens < bet) {
    setMessage(pickMessage('broke'));
    showResult('INSUFFICIENT TOKENS', 'lose');
    return;
  }

  spinning = true;
  setSpinEnabled(false);
  hideResult();

  // Deduct bet
  tokens -= bet;
  updateTokenDisplay(true);
  setMessage('Processing request… please hold…');

  // Pick outcomes
  const results = [randSymbol(), randSymbol(), randSymbol()];

  // Animate reels with staggered stops
  await Promise.all(results.map((sym, i) => spinReel(reels[i], sym, i)));

  // ── Evaluate ──────────────────────────────────────────────────────────────
  const [a, b, c] = results;
  const names = results.map(r => r.name);

  let winAmount = 0;
  let outcome   = 'lose_small';

  if (a.name === b.name && b.name === c.name) {
    // Three of a kind
    const mult = THREE_OF_A_KIND[a.name];
    if (mult < 0) {
      // Rate limited penalty
      winAmount = mult * bet;  // negative
      outcome   = 'lose_big';
    } else {
      winAmount = mult * bet;
      outcome   = a.name === 'deprecated' ? 'jackpot' : 'win_big';
    }
  } else if (a.name === b.name || b.name === c.name || a.name === c.name) {
    // Two of a kind
    winAmount = 2 * bet;
    outcome   = 'win_small';
  } else {
    // No match
    winAmount = 0;
    outcome   = 'lose_small';
  }

  // Apply winnings / penalties
  if (winAmount !== 0) {
    tokens += winAmount;
    if (tokens < 0) tokens = 0;
  }
  updateTokenDisplay(winAmount > 0);

  // ── Show result ───────────────────────────────────────────────────────────
  if (outcome === 'jackpot') {
    showResult(`💀 JACKPOT! +${winAmount} tokens`, 'jackpot');
  } else if (outcome === 'win_big') {
    showResult(`${a.emoji}${a.emoji}${a.emoji} WIN! +${winAmount} tokens`, 'win');
  } else if (outcome === 'win_small') {
    showResult(`PAIR! +${winAmount} tokens`, 'win');
  } else if (outcome === 'lose_big') {
    showResult(`💸 RATE LIMITED! ${winAmount} tokens`, 'lose');
  } else {
    showResult('NO MATCH — tokens burned', 'neutral');
  }

  setMessage(pickMessage(outcome));

  // Handle bankrupt
  if (tokens <= 0) {
    tokens = 0;
    updateTokenDisplay();
    setTimeout(() => {
      setMessage(pickMessage('broke'));
      showResult('CONTEXT WINDOW EXCEEDED — GAME OVER', 'lose');
      // Give them a bailout after a pause
      setTimeout(() => {
        tokens = 50;
        updateTokenDisplay(true);
        setMessage('Emergency token airdrop received. Anthropic is watching.');
        hideResult();
        setSpinEnabled(true);
      }, 2500);
    }, 1200);
    spinning = false;
    return;
  }

  spinning = false;
  setSpinEnabled(true);
}

// ── Event listeners ───────────────────────────────────────────────────────────
spinBtn.addEventListener('click', doSpin);

betDown.addEventListener('click', () => {
  if (bet > BET_MIN) { bet -= BET_STEP; updateBetDisplay(); }
});

betUp.addEventListener('click', () => {
  if (bet < BET_MAX) { bet += BET_STEP; updateBetDisplay(); }
});

maxBetBtn.addEventListener('click', () => {
  bet = Math.min(BET_MAX, tokens);
  // round down to nearest step
  bet = Math.max(BET_MIN, Math.floor(bet / BET_STEP) * BET_STEP);
  updateBetDisplay();
});

// Keyboard: spacebar or Enter to spin
document.addEventListener('keydown', e => {
  if ((e.key === ' ' || e.key === 'Enter') && !spinning && document.activeElement === document.body) {
    e.preventDefault();
    doSpin();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
updateTokenDisplay();
updateBetDisplay();
setMessage(pickMessage('idle'));

// Cycle idle messages when nothing is happening
setInterval(() => {
  if (!spinning) {
    const current = messageText.textContent;
    let next = pickMessage('idle');
    // avoid repeating same message
    while (next === current && MESSAGES.idle.length > 1) {
      next = pickMessage('idle');
    }
    setMessage(next);
  }
}, 7000);
