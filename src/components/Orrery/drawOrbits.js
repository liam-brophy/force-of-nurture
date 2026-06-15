import { Graphics } from 'pixi.js';
import bodiesData from '../../data/bodies.json';

function hexToNumber(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

export function drawOrbits(layer, centerX, centerY, visibleBodies) {
  layer.removeChildren();

  for (const [name, meta] of Object.entries(bodiesData)) {
    if (!visibleBodies.includes(name)) continue;

    const g = new Graphics();
    g.circle(centerX, centerY, meta.orbit_radius);
    g.stroke({ color: hexToNumber(meta.color), alpha: 0.18, width: 0.8 });
    layer.addChild(g);
  }
}
