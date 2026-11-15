import { test, expect } from '@playwright/test';

async function load(page) {
  await page.goto('/');
  await expect(page.locator('#play')).toBeEnabled();
  // Import the exact entry URL, including Vite's cache key, without booting a second game.
  await page.evaluate(async () => {
    window.game = (await import(document.querySelector('script[src*="/src/main.ts"]').src)).game;
  });
}
async function start(page) {
  await page.locator('#play').click();
  await page.waitForFunction(() => window.game.scene.getScene('Adventure').ball.body.blocked.down);
}
async function position(page, x, y) {
  await page.evaluate(([x, y]) => {
    const scene = window.game.scene.getScene('Adventure');
    scene.ball.setPosition(x, y).setVelocity(0, 0);
  }, [x, y]);
}

test('movement, jumping, pause, scoring, level rewards and persistence', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await load(page);
  await start(page);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.game.scene.getScene('Adventure').ball.x > 170);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.game.scene.getScene('Adventure').ball.y < 365);
  await page.getByRole('button', { name: 'Pause' }).click();
  const pausedY = await page.evaluate(() => window.game.scene.getScene('Adventure').ball.y);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.game.scene.getScene('Adventure').ball.y)).toBe(pausedY);
  await page.getByRole('button', { name: 'Resume' }).click();
  // Deterministic positions let the real physics overlaps exercise rewards and damage.
  await position(page, 270, 385);
  await expect(page.locator('#hud')).toContainText('Score 10');
  await position(page, 665, 410);
  await expect(page.locator('#hud')).toContainText('Lives 2');
  expect(await page.evaluate(() => window.game.scene.getScene('Adventure').ball.x)).toBeLessThan(150);
  for (const goal of [2390, 2690, 2990]) {
    await position(page, goal, 380);
    await page.waitForFunction(() => window.game.scene.getScene('Adventure').finished);
    if (goal !== 2990) {
      await page.getByRole('button', { name: 'Next level' }).click();
      await page.waitForFunction(() => !window.game.scene.getScene('Adventure').physics.world.isPaused);
    }
  }
  await expect(page.locator('#status')).toContainText('All three worlds');
  await expect(page.locator('#hud')).toContainText('Score 310');
  await page.reload();
  await expect(page.locator('#play')).toBeEnabled();
  await expect(page.locator('#level option:disabled')).toHaveCount(0);
  await expect(page.locator('#hud')).toContainText('Best 310');
  expect(errors).toEqual([]);
});

test('enemy damage, fall damage, game over and restart', async ({ page }) => {
  await load(page);
  await start(page);
  for (const expectedLives of [2, 1, 0]) {
    await page.evaluate(() => {
      const scene = window.game.scene.getScene('Adventure');
      scene.invulnerableUntil = 0;
      if (scene.enemies.length && scene.ball.x < 150) {
        const enemy = scene.enemies[0];
        scene.ball.setPosition(enemy.x, enemy.y).setVelocity(0, 0);
      } else scene.ball.setPosition(900, 600).setVelocity(0, 0);
    });
    await expect(page.locator('#hud')).toContainText(`Lives ${expectedLives}`);
    // Next iteration exercises falling rather than overlapping an enemy again.
    if (expectedLives > 0) await position(page, 900, 600);
  }
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('#hud')).toContainText('Lives 3');
  await expect(page.locator('#hud')).toContainText('Score 0');
});

test('mobile multi-touch, cancellation, background pause, and responsive layout', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await load(page);
  await start(page);
  const session = await context.newCDPSession(page);
  const right = await page.getByRole('button', { name: 'Move right' }).boundingBox();
  const jump = await page.getByRole('button', { name: 'Jump', exact: true }).boundingBox();
  const point = (box, id) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2, id });
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(right, 1)] });
  await page.waitForFunction(() => window.game.scene.getScene('Adventure').ball.x > 125);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(right, 1), point(jump, 2)] });
  await page.waitForFunction(() => window.game.scene.getScene('Adventure').ball.y < 365);
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.waitForFunction(() => window.game.scene.getScene('Adventure').ball.body.velocity.x === 0);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
