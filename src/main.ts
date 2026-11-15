import Phaser from 'phaser';
import './style.css';

const play = document.querySelector<HTMLButtonElement>('#play')!;
const status = document.querySelector<HTMLElement>('#status')!;
const hud = document.querySelector<HTMLElement>('#hud')!;
const levelSelect = document.querySelector<HTMLSelectElement>('#level')!;
const controls = { left: false, right: false, jump: false };
let jumpQueued = false;
let running = false;
let started = false;
let level = 0;
let lives = 3;
let score = 0;
let unlocked = 1;
let best = 0;
try {
  unlocked = Math.max(1, Math.min(3, Number(localStorage.getItem('bounce-unlocked')) || 1));
  best = Math.max(0, Number(localStorage.getItem('bounce-best')) || 0);
} catch { /* Storage can be unavailable inside embedded browsers. */ }

function refreshLevels() {
  levelSelect.replaceChildren(...['Greenwood Valley', 'Highland Trail', 'Sunset Summit'].map((name, index) => {
    const option = new Option(`${index + 1}. ${name}${index >= unlocked ? ' (locked)' : ''}`, String(index));
    option.disabled = index >= unlocked;
    return option;
  }));
  levelSelect.value = String(level);
}
refreshLevels();

const layouts = [
  { width: 2500, platforms: [[0, 430, 840], [940, 430, 720], [1760, 430, 740], [380, 335, 160], [1150, 330, 180], [1940, 320, 170]], spikes: [650, 1480, 2120], enemies: [1080], coins: [[270, 385], [420, 295], [500, 295], [1000, 385], [1200, 290], [1280, 290], [1850, 385], [2000, 280], [2230, 385]] },
  { width: 2800, platforms: [[0, 430, 640], [760, 430, 600], [1480, 430, 560], [2180, 430, 620], [350, 330, 150], [940, 315, 160], [1660, 320, 170], [2320, 310, 160]], spikes: [530, 1230, 1900, 2540], enemies: [840, 1560], coins: [[250, 385], [390, 290], [470, 290], [810, 385], [980, 275], [1700, 280], [1780, 280], [2240, 385], [2390, 270]] },
  { width: 3100, platforms: [[0, 430, 560], [700, 430, 550], [1400, 430, 570], [2120, 430, 450], [2710, 430, 390], [300, 330, 140], [890, 310, 170], [1590, 310, 170], [2260, 310, 140]], spikes: [460, 1120, 1840, 2460], enemies: [780, 1460, 2190], coins: [[220, 385], [340, 290], [730, 385], [940, 270], [1440, 385], [1660, 270], [2160, 385], [2300, 270], [2810, 385]] },
];

function clearInput() {
  controls.left = controls.right = controls.jump = false;
  jumpQueued = false;
}
function setRunning(value: boolean) {
  running = value;
  clearInput();
  scene.physics.world[value ? 'resume' : 'pause']();
  play.textContent = value ? 'Pause' : started ? 'Resume →' : 'Start adventure →';
}
function saveProgress() {
  try {
    localStorage.setItem('bounce-unlocked', String(unlocked));
    localStorage.setItem('bounce-best', String(best));
  } catch { /* Gameplay remains available without storage. */ }
}

class AdventureScene extends Phaser.Scene {
  ball!: Phaser.Physics.Arcade.Image;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  enemies: Phaser.Physics.Arcade.Image[] = [];
  finished = false;
  invulnerableUntil = 0;
  groundedAt = -1000;
  jumpUntil = 0;
  elapsed = 0;

  create() {
    this.finished = false;
    this.elapsed = 0;
    this.groundedAt = -1000;
    this.jumpUntil = 0;
    this.invulnerableUntil = 0;
    this.enemies = [];
    const map = layouts[level];
    this.physics.world.setBounds(0, -200, map.width, 1000);
    this.cameras.main.setBounds(0, 0, map.width, 480);
    const g = this.add.graphics();
    g.fillStyle(level === 2 ? 0xecd5b5 : 0xcce5cf).fillRect(0, 0, map.width, 480);
    g.fillStyle(0xf7efbc).fillCircle(760, 95, 42);
    for (let x = 0; x < map.width; x += 430) {
      g.fillStyle(0xa5c6ab).fillTriangle(x - 150, 430, x + 160, 100, x + 490, 430);
      g.fillStyle(0x7ea78c).fillEllipse(x + 210, 430, 650, 270);
      g.fillStyle(0x4f8169).fillRect(x + 55, 275, 10, 150).fillTriangle(x + 15, 340, x + 60, 220, x + 105, 340);
    }
    if (!this.textures.exists('ball')) {
      const art = this.make.graphics({ x: 0, y: 0 });
      art.fillStyle(0xb64138).fillCircle(24, 24, 23);
      art.fillStyle(0xee6451).fillCircle(22, 21, 21);
      art.fillStyle(0xffa084).fillEllipse(15, 11, 11, 6);
      art.fillStyle(0xffffff).fillEllipse(28, 19, 8, 10).fillEllipse(38, 19, 7, 10);
      art.fillStyle(0x283e36).fillCircle(30, 20, 2).fillCircle(40, 20, 2);
      art.lineStyle(2, 0x813c32).beginPath().arc(34, 28, 6, 0, Math.PI).strokePath();
      art.generateTexture('ball', 48, 48);
      art.clear().fillStyle(0xf3ce66).fillCircle(12, 12, 11).lineStyle(2, 0xa27728).strokeCircle(12, 12, 7);
      art.generateTexture('coin', 24, 24);
      art.clear().fillStyle(0x5b4055).fillRoundedRect(0, 0, 36, 32, 7).fillStyle(0xffffff).fillRect(7, 8, 7, 7).fillRect(23, 8, 7, 7);
      art.generateTexture('enemy', 36, 32);
      art.destroy();
    }
    const platforms = this.physics.add.staticGroup();
    for (const [x, y, width] of map.platforms) {
      g.fillStyle(0x254d42).fillRoundedRect(x, y, width, y === 430 ? 65 : 22, 5);
      g.fillStyle(0x739b52).fillRoundedRect(x, y, width, 10, 4);
      const block = this.add.rectangle(x + width / 2, y + 12, width, 24, 0, 0);
      platforms.add(block);
    }
    this.ball = this.physics.add.image(90, 370, 'ball').setCircle(23, 1, 1).setCollideWorldBounds(false);
    this.ball.setMaxVelocity(270, 700);
    this.physics.add.collider(this.ball, platforms);
    const coins = this.physics.add.staticGroup();
    for (const [x, y] of map.coins) coins.create(x, y, 'coin');
    this.physics.add.overlap(this.ball, coins, (_ball, coin) => {
      if (!running || this.finished) return;
      (coin as Phaser.Physics.Arcade.Sprite).destroy();
      score += 10;
      this.updateHud();
    });
    const hazards = this.physics.add.staticGroup();
    for (const x of map.spikes) {
      g.fillStyle(0xc36450).fillTriangle(x, 430, x + 15, 400, x + 30, 430);
      hazards.add(this.add.rectangle(x + 15, 418, 22, 24, 0, 0));
    }
    this.physics.add.overlap(this.ball, hazards, () => this.hurt());
    for (const x of map.enemies) {
      const enemy = this.physics.add.image(x, 400, 'enemy').setVelocityX(65 + level * 12);
      enemy.setData('home', x);
      this.enemies.push(enemy);
      this.physics.add.collider(enemy, platforms);
      this.physics.add.overlap(this.ball, enemy, () => this.hurt());
    }
    const flagX = map.width - 120;
    g.fillStyle(0x785c40).fillRect(flagX, 330, 6, 100);
    g.fillStyle(0xf3e7bc).fillTriangle(flagX + 6, 330, flagX + 55, 347, flagX + 6, 365);
    const goal = this.add.rectangle(flagX + 10, 380, 50, 100, 0, 0);
    this.physics.add.existing(goal, true);
    this.physics.add.overlap(this.ball, goal, () => this.complete());
    this.cameras.main.startFollow(this.ball, true, 0.12, 0.12);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('A,D') as Record<string, Phaser.Input.Keyboard.Key>;
    for (const key of ['SPACE', 'UP', 'W']) {
      this.input.keyboard!.on(`keydown-${key}`, (event: KeyboardEvent) => {
        if (running && !event.repeat) jumpQueued = true;
      });
    }
    this.input.keyboard!.addCapture(['SPACE', 'UP', 'W']);
    this.physics.pause();
    this.updateHud();
    document.querySelector('#world')!.textContent = `WORLD 0${level + 1}`;
    play.disabled = false;
  }

  updateHud() { hud.textContent = `Score ${score} · Lives ${lives} · Best ${best}`; }
  hurt() {
    if (!running || this.finished || this.elapsed < this.invulnerableUntil) return;
    lives--;
    this.updateHud();
    if (lives <= 0) {
      this.finished = true;
      setRunning(false);
      play.textContent = 'Try again →';
      status.textContent = 'Out of lives. Try again — you’ve got this!';
    } else {
      this.ball.setPosition(90, 370).setVelocity(0, 0);
      this.invulnerableUntil = this.elapsed + 1500;
      status.textContent = 'Back at the start. Watch the spikes and gaps!';
    }
  }
  complete() {
    if (!running || this.finished) return;
    this.finished = true;
    score += 100;
    best = Math.max(best, score);
    unlocked = Math.max(unlocked, Math.min(3, level + 2));
    saveProgress(); refreshLevels(); this.updateHud(); setRunning(false);
    play.textContent = level < 2 ? 'Next level →' : 'Play again →';
    status.textContent = level < 2 ? 'Level complete! +100 points. Next world unlocked.' : 'All three worlds complete! Adventure mastered.';
  }
  update(_time: number, delta: number) {
    if (!running || this.finished) return;
    this.elapsed += Math.min(delta, 50);
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    const direction = Number(controls.right || this.cursors.right.isDown || this.keys.D.isDown) - Number(controls.left || this.cursors.left.isDown || this.keys.A.isDown);
    this.ball.setVelocityX(direction * 240);
    const jump = jumpQueued;
    jumpQueued = false;
    if (jump) this.jumpUntil = this.elapsed + 120;
    if (body.blocked.down || body.touching.down) this.groundedAt = this.elapsed;
    if (this.jumpUntil > this.elapsed && this.elapsed - this.groundedAt < 100) {
      this.ball.setVelocityY(-455);
      this.jumpUntil = 0; this.groundedAt = -1000;
    }
    this.ball.x = Math.max(24, this.ball.x);
    this.ball.setAlpha(this.elapsed < this.invulnerableUntil ? (Math.floor(this.elapsed / 100) % 2 ? 0.4 : 1) : 1);
    for (const enemy of this.enemies) {
      const home = enemy.getData('home') as number;
      if (enemy.x > home + 90) enemy.setVelocityX(-65 - level * 12);
      if (enemy.x < home - 30) enemy.setVelocityX(65 + level * 12);
    }
    if (this.ball.y > 540) this.hurt();
  }
}

const scene = new AdventureScene('Adventure');
play.disabled = true;
export const game = new Phaser.Game({
  type: Phaser.CANVAS, parent: 'game', width: 960, height: 480,
  backgroundColor: '#cce5cf',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1000 }, debug: false } },
  scene, render: { antialias: true },
});

function startLevel(resetScore = false) {
  setRunning(false);
  if (resetScore) { score = 0; lives = 3; }
  started = true;
  scene.scene.restart();
  scene.events.once(Phaser.Scenes.Events.CREATE, () => {
    setRunning(true);
    status.textContent = 'Reach the flag! Arrow keys / A D to move · Space / W / ↑ to jump.';
  });
}
play.addEventListener('click', () => {
  if (!started) { startLevel(true); return; }
  if (scene.finished) {
    if (lives > 0 && level < 2) { level++; startLevel(); }
    else { level = 0; startLevel(true); }
    levelSelect.value = String(level);
    return;
  }
  setRunning(!running);
  status.textContent = running ? 'Reach the flag! Collect coins and avoid danger.' : 'Paused. Take a breather.';
});
document.querySelector('#restart')!.addEventListener('click', () => startLevel(true));
levelSelect.addEventListener('change', () => { level = Number(levelSelect.value); startLevel(true); });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-control]')) {
  const key = button.dataset.control as keyof typeof controls;
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    if (!running) return;
    button.setPointerCapture(event.pointerId);
    controls[key] = true;
    if (key === 'jump') jumpQueued = true;
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => { controls[key] = false; });
}
function backgroundPause() { if (running) { setRunning(false); status.textContent = 'Paused. Resume when you’re ready.'; } }
window.addEventListener('blur', backgroundPause);
document.addEventListener('visibilitychange', () => { if (document.hidden) backgroundPause(); });
if (import.meta.hot) import.meta.hot.dispose(() => game.destroy(true));
