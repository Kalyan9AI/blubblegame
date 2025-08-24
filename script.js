/*
  Bubble Pop! — simple, responsive bubble popping game.
  Click or tap bubbles to score before time runs out.
*/

const dom = {
  game: document.getElementById('game'),
  scoreValue: document.getElementById('scoreValue'),
  timeValue: document.getElementById('timeValue'),
  bestValue: document.getElementById('bestValue'),
  startButton: document.getElementById('startButton'),
  restartButton: document.getElementById('restartButton'),
  muteButton: document.getElementById('muteButton'),
  overlay: document.getElementById('overlay'),
  finalScore: document.getElementById('finalScore'),
  finalBest: document.getElementById('finalBest'),
  playAgainButton: document.getElementById('playAgainButton'),
};

/**
 * Handles synthesizing short pop sounds using WebAudio.
 */
class PopSoundPlayer {
  constructor() {
    this.audioContext = null;
    this.isMuted = false;
  }

  ensureContextStarted() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
  }

  /**
   * Plays a short popping tone with quick decay.
   */
  playPop() {
    if (this.isMuted) return;
    this.ensureContextStarted();
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const duration = 0.12;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Randomize base frequency slightly for variety
    const base = 280 + Math.random() * 120; // 280–400 Hz
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 2.2, now + duration * 0.5);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}

/**
 * Core game controller for state and loop management.
 */
class BubblePopGame {
  constructor(root) {
    this.root = root;
    this.isRunning = false;
    this.score = 0;
    this.bestScore = Number(localStorage.getItem('bubble_pop_best') || '0');
    this.remainingSeconds = 60;
    this.spawnIntervalMs = 900;
    this.minimumSpawnMs = 280;
    this.spawnAccelerationScoreStep = 6; // speed up every N points
    this.bubbleIdCounter = 0;

    this.spawnTimer = null;
    this.secondTimer = null;

    this.sound = new PopSoundPlayer();
    const savedMute = localStorage.getItem('bubble_pop_muted');
    this.sound.setMuted(savedMute === '1');
    dom.muteButton.setAttribute('aria-pressed', this.sound.isMuted ? 'true' : 'false');
    dom.muteButton.textContent = this.sound.isMuted ? '🔇' : '🔊';

    this.handleResize = this.handleResize.bind(this);
    this.handleBubbleClick = this.handleBubbleClick.bind(this);
  }

  init() {
    this.updateHud();
    window.addEventListener('resize', this.handleResize);
    dom.startButton.addEventListener('click', () => this.start());
    dom.restartButton.addEventListener('click', () => this.restart());
    dom.playAgainButton.addEventListener('click', () => this.restart());
    dom.muteButton.addEventListener('click', () => this.toggleMute());

    // Allow keyboard to start
    document.addEventListener('keydown', (e) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !this.isRunning) {
        this.start();
      }
    });
  }

  toggleMute() {
    const newMuted = !this.sound.isMuted;
    this.sound.setMuted(newMuted);
    localStorage.setItem('bubble_pop_muted', newMuted ? '1' : '0');
    dom.muteButton.setAttribute('aria-pressed', newMuted ? 'true' : 'false');
    dom.muteButton.textContent = newMuted ? '🔇' : '🔊';
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    dom.overlay.hidden = true;
    dom.startButton.hidden = true;
    dom.restartButton.hidden = false;
    this.score = 0;
    this.remainingSeconds = 60;
    this.spawnIntervalMs = 900;
    this.clearBubbles();
    this.updateHud();

    this.secondTimer = setInterval(() => this.tickSecond(), 1000);
    this.spawnTimer = setInterval(() => this.spawnBubble(), this.spawnIntervalMs);
  }

  restart() {
    this.stopTimers();
    this.start();
  }

  end() {
    this.isRunning = false;
    this.stopTimers();
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('bubble_pop_best', String(this.bestScore));
    }
    dom.finalScore.textContent = String(this.score);
    dom.finalBest.textContent = String(this.bestScore);
    dom.overlay.hidden = false;
    dom.startButton.hidden = false;
    dom.restartButton.hidden = true;
  }

  stopTimers() {
    if (this.secondTimer) clearInterval(this.secondTimer);
    if (this.spawnTimer) clearInterval(this.spawnTimer);
    this.secondTimer = null;
    this.spawnTimer = null;
  }

  tickSecond() {
    this.remainingSeconds -= 1;
    if (this.remainingSeconds <= 0) {
      this.remainingSeconds = 0;
      this.updateHud();
      this.end();
      return;
    }
    this.updateHud();
  }

  updateHud() {
    dom.scoreValue.textContent = String(this.score);
    dom.timeValue.textContent = String(this.remainingSeconds);
    dom.bestValue.textContent = String(this.bestScore);
  }

  clearBubbles() {
    this.root.innerHTML = '';
  }

  handleResize() {
    // No-op for now; reserved for future dynamic sizing if needed
  }

  /**
   * Generates a bubble element with random style and motion.
   */
  spawnBubble() {
    if (!this.isRunning) return;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.tabIndex = 0;
    const id = ++this.bubbleIdCounter;
    bubble.dataset.id = String(id);

    const gameRect = this.root.getBoundingClientRect();

    const minSize = 28; // px
    const maxSize = Math.max(48, Math.floor(gameRect.width * 0.08));
    const size = Math.floor(minSize + Math.random() * (maxSize - minSize));
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;

    const leftPercent = Math.random() * 92; // keep within bounds
    bubble.style.left = `${leftPercent}%`;

    // Color shift for variety
    const hue = Math.floor(Math.random() * 360);
    const sat = 80;
    const light = 55;
    bubble.style.setProperty('--bubble-color', `hsl(${hue} ${sat}% ${light}% / 0.7)`);

    // Rise duration: smaller and later bubbles move faster
    const baseDuration = 6.0;
    const speedFactor = 1.0 + Math.min(1.4, this.score / 40);
    const sizeFactor = 1.0 + (size - minSize) / (maxSize - minSize + 1);
    const duration = Math.max(2.2, baseDuration / (speedFactor * 0.7 + Math.random() * 0.6) * (sizeFactor));
    bubble.style.setProperty('--rise-duration', `${duration.toFixed(2)}s`);

    bubble.addEventListener('click', this.handleBubbleClick, { passive: true });
    bubble.addEventListener('touchstart', this.handleBubbleClick, { passive: true });
    bubble.addEventListener('animationend', () => {
      // Remove if not popped when it leaves the screen
      bubble.remove();
    });

    this.root.appendChild(bubble);
  }

  /**
   * Computes points for a bubble based on its size.
   */
  getPointsForBubble(bubble) {
    const size = bubble.offsetWidth;
    if (size <= 34) return 3;
    if (size <= 44) return 2;
    return 1;
  }

  handleBubbleClick(ev) {
    if (!this.isRunning) return;
    const target = ev.currentTarget;
    if (!(target instanceof HTMLElement)) return;

    target.classList.add('pop');
    this.sound.playPop();
    const points = this.getPointsForBubble(target);
    this.score += points;
    this.updateHud();

    // Difficulty ramp: decrease spawn interval
    if (this.score % this.spawnAccelerationScoreStep === 0) {
      this.accelerateSpawning();
    }

    // Remove after transition ends
    target.addEventListener('transitionend', () => target.remove(), { once: true });
  }

  accelerateSpawning() {
    const newInterval = Math.max(this.minimumSpawnMs, Math.floor(this.spawnIntervalMs * 0.92));
    if (newInterval !== this.spawnIntervalMs) {
      this.spawnIntervalMs = newInterval;
      if (this.spawnTimer) {
        clearInterval(this.spawnTimer);
        this.spawnTimer = setInterval(() => this.spawnBubble(), this.spawnIntervalMs);
      }
    }
  }
}

const game = new BubblePopGame(dom.game);
game.init();


