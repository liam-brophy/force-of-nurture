import { Graphics } from 'pixi.js';

// Generate star field once at module load — deterministic positions via seeded LCG
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const rand = seededRandom(0xdeadbeef);
const STAR_COUNT = 220;
const stars = Array.from({ length: STAR_COUNT }, (_, i) => ({
  nx: rand(),
  ny: rand(),
  r: 0.4 + rand() * 0.9,
  group: i % 3,
}));

const PHASE = [0, Math.PI * 0.7, Math.PI * 1.4];
const SPEED = [0.6, 0.45, 0.8];

export function initBackground(bgContainer, app) {
  const groups = [new Graphics(), new Graphics(), new Graphics()];
  groups.forEach((g) => bgContainer.addChild(g));

  function draw(w, h) {
    groups.forEach((g) => g.clear());
    for (const star of stars) {
      const g = groups[star.group];
      g.circle(star.nx * w, star.ny * h, star.r);
      g.fill({ color: 0xfff8f0, alpha: 1 });
    }
  }

  let elapsed = 0;
  const tickFn = (ticker) => {
    elapsed += ticker.deltaMS * 0.001;
    groups[0].alpha = 0.55 + 0.35 * Math.sin(elapsed * SPEED[0] + PHASE[0]);
    groups[1].alpha = 0.55 + 0.35 * Math.sin(elapsed * SPEED[1] + PHASE[1]);
    groups[2].alpha = 0.55 + 0.35 * Math.sin(elapsed * SPEED[2] + PHASE[2]);
  };

  app.ticker.add(tickFn);
  draw(window.innerWidth, window.innerHeight);

  return {
    resize(w, h) { draw(w, h); },
    destroy() { app.ticker.remove(tickFn); },
  };
}
