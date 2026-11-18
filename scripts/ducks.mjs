#!/usr/bin/env node
// TBA — single lead duck (field agent) animation for long-running ops.
//
// Usage:
//   import { Scout } from './ducks.mjs'
//   const scout = new Scout()
//   scout.start('Timeline sweep')
//   scout.say('Dispatching field agent.')
//   scout.tick({ file: 'src/api/handler.go', done: 8, total: 24 })
//   scout.mark('manifest', 'done')
//   scout.mark('.env', 'skipped')
//   await scout.stop({ final: 'All agents returned.' })
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

const EYE_FRAMES = ['·', '◦', '·', '·', '-', '·'];
const BEAK_FRAMES = ['<', '=', '>', '='];

function renderDuck({ eye, beak, color }) {
  const c = color || ANSI.fg.cream;
  const r = ANSI.fg.reset;
  //         _
  //   .__( · )<
  //      \__)
  return [
    `${c}       _    ${r}`,
    `${c}  .__( ${eye} )${beak}${r}`,
    `${c}      \\__)  ${r}`,
  ];
}

const STATE_GLYPH = {
  pending: `${ANSI.fg.dim}·${ANSI.fg.reset}`,
  scanning: `${ANSI.fg.amber}▸${ANSI.fg.reset}`,
  done: `${ANSI.fg.green}✓${ANSI.fg.reset}`,
  skipped: `${ANSI.fg.amber}⚠${ANSI.fg.reset}`,
  error: `${ANSI.fg.red}×${ANSI.fg.reset}`,
};

export class Scout {
  constructor({ stream = process.stdout, maxLedger = 5 } = {}) {
    this.stream = stream;
    this.tty = Boolean(stream.isTTY);
    this.state = 'scanning'; // scanning | alert | rest | error
    this.eyePhase = 0;
    this.beakPhase = 0;
    this.label = '';
    this.file = '';
    this.dialog = '';
    this.counter = { done: 0, total: 0 };
    // ledger: array of { name, status } — last N shown on right
    this.ledger = [];
    this.maxLedger = maxLedger;
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

  say(dialog) {
    this.dialog = dialog;
  }

  tick(ledger = {}) {
    if (ledger.file != null) this.file = ledger.file;
    if (ledger.done != null) this.counter.done = ledger.done;
    if (ledger.total != null) this.counter.total = ledger.total;
    if (ledger.dialog != null) this.dialog = ledger.dialog;
    if (!this.tty && ledger.file) {
      this.stream.write(`  ▸ ${ledger.file}\n`);
    }
  }

  // name: file or category, status: scanning|done|skipped|error
  mark(name, status) {
    const existing = this.ledger.findIndex((e) => e.name === name);
    if (existing >= 0) {
      this.ledger[existing].status = status;
    } else {
      this.ledger.push({ name, status });
      if (this.ledger.length > this.maxLedger) {
        this.ledger.shift();
      }
    }
    // react visually
    if (status === 'skipped' || status === 'error') {
      this._alertPulse();
    }
    if (!this.tty) {
      this.stream.write(`  ${this._plainMark(status)} ${name}\n`);
    }
  }

  _plainMark(status) {
    return { pending: '·', scanning: '▸', done: '✓', skipped: '⚠', error: '×' }[status] || '·';
  }

  _alertPulse() {
    this.state = 'alert';
    clearTimeout(this._pulseTimer);
    this._pulseTimer = setTimeout(() => {
      if (this.state === 'alert') this.state = 'scanning';
    }, 800);
  }

  async stop({ final = 'sweep complete', ok = true } = {}) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.state = ok ? 'rest' : 'error';
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
    if (this.state === 'scanning' || this.state === 'alert') {
      this.eyePhase = (this.eyePhase + 1) % EYE_FRAMES.length;
      if (Math.random() < 0.18) {
        this.beakPhase = (this.beakPhase + 1) % BEAK_FRAMES.length;
      }
    }
    this._draw();
  }

  _draw() {
    if (!this.tty) return;
    if (this.lastBlockHeight > 0) {
      this.stream.write(ANSI.up(this.lastBlockHeight));
      this.stream.write(ANSI.clearBelow);
    }

    let eye, beak, color;
    if (this.state === 'scanning') {
      eye = EYE_FRAMES[this.eyePhase];
      beak = BEAK_FRAMES[this.beakPhase];
      color = ANSI.fg.cream;
    } else if (this.state === 'alert') {
      eye = 'o';
      beak = '<';
      color = ANSI.fg.amber;
    } else if (this.state === 'rest') {
      eye = '×';
      beak = '=';
      color = ANSI.fg.gold;
    } else {
      // error
      eye = '×';
      beak = '=';
      color = ANSI.fg.red;
    }

    const duck = renderDuck({ eye, beak, color });

    // right-side: dialog (line 2) OR nothing
    const dialogLine = this.dialog
      ? `  ${ANSI.fg.dim}Lead: "${this.dialog}"${ANSI.fg.reset}`
      : '';

    const lines = [];
    lines.push(duck[0]);
    lines.push(duck[1] + dialogLine);
    lines.push(duck[2]);
    lines.push('');

    // progress line
    const { done, total } = this.counter;
    const progress = total > 0 ? ` (${done}/${total})` : '';
    const file = this.file || this.label || 'Scanning sacred timeline...';
    const cols = this.stream.columns || 80;
    lines.push(
      `  ${ANSI.fg.amber}▸${ANSI.fg.reset} ${_truncate(file + progress, cols - 6)}`
    );

    // ledger (last N) — vertical
    if (this.ledger.length > 0) {
      lines.push('');
      for (const e of this.ledger) {
        const glyph = STATE_GLYPH[e.status] || STATE_GLYPH.pending;
        const dim = e.status === 'pending' ? ANSI.fg.dim : '';
        const reset = e.status === 'pending' ? ANSI.fg.reset : '';
        lines.push(`  ${glyph} ${dim}${e.name}${reset}`);
      }
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

// Back-compat alias (anything that imported Flock still works as Scout)
export const Flock = Scout;

function _truncate(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)) + '…';
}

// ──────────────────────────────────────────────────────────────
// Demo
// ──────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (arg === 'demo') {
    const files = [
      { name: 'package.json', dialog: 'Dispatching field agent.' },
      { name: 'README.md' },
      { name: 'docker-compose.yml', dialog: 'Variance nominal.' },
      { name: 'src/api/handler.go' },
      { name: '.env', skip: true, dialog: 'Quack! Variant detected.' },
      { name: 'src/db/migration.sql' },
      { name: 'src/service/user.go', dialog: 'Sweeping src tree...' },
      { name: 'src/utils/log.go' },
      { name: 'test/user_test.go' },
      { name: 'docs/architecture.mmd', dialog: 'Finalizing project map.' },
    ];
    const scout = new Scout();
    scout.start('Timeline sweep');
    scout.setCounter?.(0, files.length);

    let i = 0;
    const walk = setInterval(() => {
      if (i >= files.length) {
        clearInterval(walk);
        scout.stop({ final: 'Project map saved: .tba/project-map.md' })
          .then(() => process.exit(0));
        return;
      }
      const f = files[i];
      // mark as scanning first
      scout.mark(f.name, 'scanning');
      scout.tick({ file: f.name, done: i + 1, total: files.length, dialog: f.dialog });
      // then after ~400ms mark as done/skipped
      setTimeout(() => {
        scout.mark(f.name, f.skip ? 'skipped' : 'done');
      }, 400);
      i++;
    }, 600);
  } else {
    console.log('Usage: node ducks.mjs demo');
  }
}
