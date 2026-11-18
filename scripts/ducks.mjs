#!/usr/bin/env node
// TBA duck animation — row of field agents with blinking eyes and quacking beaks.
// Usage:
//   import { Flock } from './ducks.mjs'
//   const flock = new Flock({ count: 4 })
//   flock.start('Timeline sweep')
//   flock.status(0, 'done'); flock.setFile('src/api/handler.go')
//   flock.say('Variance nominal.')
//   await flock.stop({ final: 'sweep complete' })
//
// CLI demo:
//   node ducks.mjs demo

const ANSI = {
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  up: (n) => `\x1b[${n}A`,
  clearLine: '\x1b[2K',
  clearBelow: '\x1b[J',
  home: '\r',
  fg: {
    amber: '\x1b[38;5;208m',
    gold: '\x1b[38;5;178m',
    cream: '\x1b[38;5;223m',
    dim: '\x1b[2m',
    red: '\x1b[38;5;160m',
    green: '\x1b[38;5;34m',
    reset: '\x1b[0m',
  },
};

// Eye frames (middle char = eye direction; animated per-duck phase)
const EYE_FRAMES = ['·', '◦', '·', '·', '-', '·'];
const BEAK_FRAMES = ['<', '=', '>', '='];

// State overrides
const STATE_EYE = {
  found: '×',    // satisfied
  skipped: 'o',  // alert (nexus event)
  error: '×',
  rest: '×',
};
const STATE_BEAK = {
  found: '=',
  skipped: '<',
  error: '=',
  rest: '=',
};

function renderDuck({ eye, beak, color }) {
  const c = color || ANSI.fg.cream;
  const r = ANSI.fg.reset;
  //          _
  //    .__( · )<
  //       \__)
  return [
    `${c}        _    ${r}`,
    `${c}  .__( ${eye} )${beak} ${r}`,
    `${c}       \\__)  ${r}`,
  ];
}

export class Flock {
  constructor({ count = 4, stream = process.stdout } = {}) {
    this.count = count;
    this.stream = stream;
    this.tty = Boolean(stream.isTTY);
    this.phases = Array.from({ length: count }, () =>
      Math.floor(Math.random() * EYE_FRAMES.length)
    );
    this.beakPhases = Array.from({ length: count }, () =>
      Math.floor(Math.random() * BEAK_FRAMES.length)
    );
    this.states = Array.from({ length: count }, () => 'scanning');
    this.label = '';
    this.file = '';
    this.dialog = '';
    this.counter = { done: 0, total: 0 };
    this.lastBlockHeight = 0;
    this.timer = null;
    this.startedAt = 0;
  }

  start(label = '') {
    this.label = label;
    this.startedAt = Date.now();
    if (!this.tty) {
      this.stream.write(`[⌛ TIMELINE SWEEP] ${label}\n`);
      return;
    }
    this.stream.write(ANSI.hideCursor);
    this._installSigintTrap();
    this._draw();
    this.timer = setInterval(() => this._tick(), 150);
  }

  status(i, state) {
    if (i < 0 || i >= this.count) return;
    this.states[i] = state;
  }

  setFile(path) {
    this.file = path;
  }

  setCounter(done, total) {
    this.counter = { done, total };
  }

  say(dialog) {
    this.dialog = dialog;
  }

  tick(ledger) {
    // ledger = { file, done, total, dialog }
    if (ledger?.file != null) this.file = ledger.file;
    if (ledger?.done != null) this.counter.done = ledger.done;
    if (ledger?.total != null) this.counter.total = ledger.total;
    if (ledger?.dialog != null) this.dialog = ledger.dialog;
    if (!this.tty) {
      if (ledger?.file) this.stream.write(`  ▸ ${ledger.file}\n`);
    }
  }

  async stop({ final = 'sweep complete', ok = true } = {}) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.states = this.states.map(() => (ok ? 'rest' : 'error'));
    if (this.tty) {
      this._draw();
      this.stream.write(ANSI.showCursor);
    }
    const stamp = ok ? '[◎ SWEEP COMPLETE]' : '[⚠ NEXUS EVENT]';
    const color = ok ? ANSI.fg.green : ANSI.fg.red;
    this.stream.write(
      `\n${color}${stamp}${ANSI.fg.reset} ${final}  ` +
      `${ANSI.fg.dim}(${((Date.now() - this.startedAt) / 1000).toFixed(2)}s)${ANSI.fg.reset}\n`
    );
    this._uninstallSigintTrap();
  }

  _tick() {
    // advance per-duck phase
    for (let i = 0; i < this.count; i++) {
      if (this.states[i] === 'scanning') {
        this.phases[i] = (this.phases[i] + 1) % EYE_FRAMES.length;
        if (Math.random() < 0.15)
          this.beakPhases[i] = (this.beakPhases[i] + 1) % BEAK_FRAMES.length;
      }
    }
    this._draw();
  }

  _draw() {
    if (!this.tty) return;
    // move cursor up to overwrite previous block
    if (this.lastBlockHeight > 0) {
      this.stream.write(ANSI.up(this.lastBlockHeight));
      this.stream.write(ANSI.clearBelow);
    }

    const lines = [];

    // ducks
    const duckLines = [[], [], []];
    for (let i = 0; i < this.count; i++) {
      const state = this.states[i];
      let eye, beak, color;
      if (state === 'scanning') {
        eye = EYE_FRAMES[this.phases[i]];
        beak = BEAK_FRAMES[this.beakPhases[i]];
        color = ANSI.fg.cream;
      } else if (state === 'skipped') {
        eye = STATE_EYE.skipped;
        beak = STATE_BEAK.skipped;
        color = ANSI.fg.amber;
      } else if (state === 'error') {
        eye = STATE_EYE.error;
        beak = STATE_BEAK.error;
        color = ANSI.fg.red;
      } else if (state === 'found' || state === 'rest') {
        eye = STATE_EYE[state];
        beak = STATE_BEAK[state];
        color = ANSI.fg.gold;
      } else {
        eye = '·';
        beak = '=';
        color = ANSI.fg.dim;
      }
      const d = renderDuck({ eye, beak, color });
      duckLines[0].push(d[0]);
      duckLines[1].push(d[1]);
      duckLines[2].push(d[2]);
    }
    lines.push('   ' + duckLines[0].join('  '));
    lines.push('   ' + duckLines[1].join('  '));
    lines.push('   ' + duckLines[2].join('  '));
    lines.push('');

    // counter + file
    const { done, total } = this.counter;
    const progress = total > 0 ? ` (${done}/${total})` : '';
    const file = this.file ? `▸ ${this.file}` : (this.label || 'Scanning sacred timeline...');
    const truncated = _truncate(file + progress, (this.stream.columns || 80) - 4);
    lines.push(`   ${ANSI.fg.amber}${truncated}${ANSI.fg.reset}`);

    // dialog (lead agent)
    if (this.dialog) {
      lines.push(`   ${ANSI.fg.dim}Lead: "${this.dialog}"${ANSI.fg.reset}`);
    }

    const out = lines.join('\n') + '\n';
    this.stream.write(out);
    this.lastBlockHeight = lines.length;
  }

  _installSigintTrap() {
    this._sigintHandler = () => {
      if (this.timer) clearInterval(this.timer);
      this.stream.write(ANSI.showCursor + '\n');
      process.exit(130);
    };
    process.on('SIGINT', this._sigintHandler);
  }

  _uninstallSigintTrap() {
    if (this._sigintHandler) {
      process.removeListener('SIGINT', this._sigintHandler);
      this._sigintHandler = null;
    }
  }
}

function _truncate(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)) + '…';
}

// ──────────────────────────────────────────────────────────────
// Demo mode: `node ducks.mjs demo`
// ──────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (arg === 'demo') {
    const files = [
      'package.json',
      'README.md',
      'docker-compose.yml',
      'src/api/handler.go',
      'src/db/migration.sql',
      'src/service/user.go',
      '.env',
      'src/utils/log.go',
      'test/user_test.go',
      'docs/architecture.mmd',
    ];
    const flock = new Flock({ count: 4 });
    flock.start('Timeline sweep');
    flock.say('Dispatching field agents.');
    flock.setCounter(0, files.length);

    let i = 0;
    const walk = setInterval(() => {
      if (i >= files.length) {
        clearInterval(walk);
        flock.stop({ final: 'All agents returned. Project map saved.' })
          .then(() => process.exit(0));
        return;
      }
      const f = files[i];
      flock.tick({ file: f, done: i + 1 });

      // random: mark one duck as "found"/"skipped" momentarily
      if (f === '.env') {
        flock.status(0, 'skipped');
        flock.say('Quack! Variant detected.');
        setTimeout(() => flock.status(0, 'scanning'), 600);
      } else if (i === 3) {
        flock.say('Variance within parameters.');
      } else if (i === 7) {
        flock.say('Sweeping src tree...');
      }
      i++;
    }, 500);
  } else {
    console.log('Usage: node ducks.mjs demo');
  }
}
