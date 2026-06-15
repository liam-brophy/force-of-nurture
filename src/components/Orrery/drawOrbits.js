import { Graphics } from 'pixi.js';
import bodiesData from '../../data/bodies.json';

export function drawOrbits(layer, centerX, centerY, visibleBodies) {
  layer.removeChildren();

  for (const [name, meta] of Object.entries(bodiesData)) {
    if (!visibleBodies.includes(name)) continue;

    const g = new Graphics();
    g.circle(centerX, centerY, meta.orbit_radius);
    g.stroke({ color: 0xf2e9d8, alpha: 0.08, width: 1 });
    layer.addChild(g);
  }
}
