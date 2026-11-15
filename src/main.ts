import Phaser from 'phaser';
import './style.css';

const play = document.querySelector<HTMLButtonElement>('#play')!;
const status = document.querySelector<HTMLElement>('#status')!;
let active = false;
let ready = false;
let idleTween: Phaser.Tweens.Tween;

class ValleyScene extends Phaser.Scene {
  create() {
    const g = this.add.graphics();
    g.fillStyle(0xcce5cf).fillRect(0, 0, 960, 480);
    g.fillStyle(0xf7efbc).fillCircle(760, 100, 44);
    // Original scenery drawn with primitives: no external assets required.
    g.fillStyle(0xa5c6ab);
    g.fillTriangle(-100, 370, 170, 105, 430, 370);
    g.fillTriangle(270, 370, 580, 125, 850, 370);
    g.fillTriangle(640, 370, 900, 140, 1150, 370);
    g.fillStyle(0x7ea78c);
    g.fillEllipse(160, 380, 650, 260);
    g.fillEllipse(800, 390, 700, 250);
    g.fillStyle(0x4f8169);
    for (const x of [70, 130, 740, 810, 880]) {
      g.fillRect(x - 5, 267, 10, 130);
      g.fillTriangle(x - 40, 310, x, 210, x + 40, 310);
      g.fillTriangle(x - 48, 345, x, 240, x + 48, 345);
    }
    g.fillStyle(0x254d42).fillRoundedRect(-20, 382, 1000, 130, 20);
    g.fillStyle(0x739b52).fillRoundedRect(-20, 374, 1000, 20, 8);
    g.fillStyle(0x355c49);
    for (let x = 10; x < 960; x += 49) g.fillCircle(x, 420 + (x % 31), 3);
    g.fillStyle(0x315d4a).fillRoundedRect(460, 310, 140, 22, 8);
    g.fillStyle(0x95b868).fillRoundedRect(460, 306, 140, 9, 4);
    g.lineStyle(3, 0xf3d275);
    for (const x of [488, 530, 572]) g.strokeCircle(x, 278, 9);
    g.fillStyle(0x785c40).fillRect(665, 294, 6, 80);
    g.fillStyle(0xf3e7bc).fillTriangle(671, 294, 711, 308, 671, 323);

    const ball = this.add.container(280, 348);
    const shadow = this.add.ellipse(280, 374, 48, 9, 0x153c32, 0.22);
    const body = this.add.graphics();
    body.fillStyle(0xb64138).fillCircle(0, 0, 25);
    body.fillStyle(0xee6451).fillCircle(-2, -4, 22);
    body.fillStyle(0xffa084).fillEllipse(-9, -13, 12, 7);
    body.fillStyle(0xffffff).fillEllipse(6, -5, 8, 10).fillEllipse(16, -5, 7, 10);
    body.fillStyle(0x283e36).fillCircle(8, -4, 2).fillCircle(18, -4, 2);
    body.lineStyle(2, 0x813c32).beginPath().arc(12, 4, 6, 0, Math.PI).strokePath();
    ball.add(body);
    idleTween = this.tweens.add({ targets: ball, y: 335, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut', paused: true });
    this.tweens.add({ targets: shadow, scaleX: 0.75, alpha: 0.12, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut', paused: true });
    ready = true;
    play.disabled = false;
    this.game.events.on('preview-toggle', (running: boolean) => {
      for (const tween of this.tweens.getTweens()) running ? tween.resume() : tween.pause();
    });
  }
}

play.disabled = true;
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 480,
  backgroundColor: '#cce5cf',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: ValleyScene,
  render: { antialias: true },
});

play.addEventListener('click', () => {
  if (!ready || !idleTween) return;
  active = !active;
  game.events.emit('preview-toggle', active);
  play.textContent = active ? 'Pause preview Ⅱ' : 'Resume preview ↗';
  status.textContent = active ? 'Preview running · Gameplay arrives in Phase 2.' : 'Preview paused.';
});

// Pause when backgrounded; returning never silently restarts the preview.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && active) play.click();
});

if (import.meta.hot) import.meta.hot.dispose(() => game.destroy(true));
