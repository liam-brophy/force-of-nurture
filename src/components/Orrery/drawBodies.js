import { Graphics, Text, Container } from 'pixi.js';
import bodiesData from '../../data/bodies.json';

const DEG = Math.PI / 180;

function lonToXY(lon, radius, centerX, centerY) {
  const angle = (lon - 90) * DEG;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

function hexToNumber(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

export function drawBodies(layer, centerX, centerY, positions, visibleBodies, onHover, onClick) {
  layer.removeChildren();

  // Earth at center
  const earth = new Graphics();
  earth.circle(centerX, centerY, 10);
  earth.fill({ color: 0x4a7cbf });
  earth.circle(centerX, centerY, 10);
  earth.stroke({ color: 0xf2e9d8, alpha: 0.5, width: 1 });
  layer.addChild(earth);

  const earthLabel = new Text({
    text: '⊕',
    style: {
      fontFamily: 'Cormorant Garamond, serif',
      fontSize: 12,
      fill: 0xf2e9d8,
      align: 'center',
    },
  });
  earthLabel.anchor.set(0.5);
  earthLabel.position.set(centerX, centerY);
  layer.addChild(earthLabel);

  for (const bodyName of visibleBodies) {
    const meta = bodiesData[bodyName];
    const pos = positions[bodyName];
    if (!meta || !pos) continue;

    const { x, y } = lonToXY(pos.lon, meta.orbit_radius, centerX, centerY);
    const color = hexToNumber(meta.color);

    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    // Glow ring
    const glow = new Graphics();
    glow.circle(x, y, meta.size + 4);
    glow.fill({ color, alpha: 0.15 });
    container.addChild(glow);

    // Planet circle
    const circle = new Graphics();
    circle.circle(x, y, meta.size);
    circle.fill({ color });
    if (pos.retrograde) {
      circle.circle(x, y, meta.size);
      circle.stroke({ color: 0x7b5ea7, alpha: 0.9, width: 1.5 });
    }
    container.addChild(circle);

    // Glyph
    const glyph = new Text({
      text: meta.glyph,
      style: {
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: meta.size + 4,
        fill: 0xf2e9d8,
        align: 'center',
      },
    });
    glyph.anchor.set(0.5);
    glyph.position.set(x, y - meta.size - 10);
    container.addChild(glyph);

    // Retrograde indicator
    if (pos.retrograde) {
      const rx = new Text({
        text: 'Rx',
        style: {
          fontFamily: 'DM Mono, monospace',
          fontSize: 8,
          fill: 0x7b5ea7,
          align: 'center',
        },
      });
      rx.anchor.set(0.5);
      rx.position.set(x + meta.size + 6, y - meta.size - 2);
      container.addChild(rx);
    }

    container.on('pointerover', () => {
      glow.clear();
      glow.circle(x, y, meta.size + 8);
      glow.fill({ color, alpha: 0.3 });
      onHover?.(bodyName, x, y, pos);
    });

    container.on('pointerout', () => {
      glow.clear();
      glow.circle(x, y, meta.size + 4);
      glow.fill({ color, alpha: 0.15 });
      onHover?.(null);
    });

    container.on('pointerdown', () => onClick?.(bodyName));

    layer.addChild(container);
  }
}
