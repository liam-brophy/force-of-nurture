import { Graphics, Text, Container } from 'pixi.js';
import bodiesData from '../../data/bodies.json';

const DEG = Math.PI / 180;

function lonToXY(lon, radius, cx, cy) {
  const angle = (lon - 90) * DEG;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function hexToNumber(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

// Draw Earth as a cross-in-circle using Graphics — no Unicode symbol
function drawEarthGraphic(g) {
  g.clear();
  g.circle(0, 0, 10);
  g.fill({ color: 0x3a6fa8 });
  g.circle(0, 0, 10);
  g.stroke({ color: 0xf2e9d8, alpha: 0.45, width: 1 });
  // Horizontal bar
  g.moveTo(-7, 0);
  g.lineTo(7, 0);
  g.stroke({ color: 0xf2e9d8, alpha: 0.6, width: 1 });
  // Vertical bar
  g.moveTo(0, -7);
  g.lineTo(0, 7);
  g.stroke({ color: 0xf2e9d8, alpha: 0.6, width: 1 });
}

function createEarthNode(layer) {
  const container = new Container();
  const g = new Graphics();
  drawEarthGraphic(g);
  container.addChild(g);
  layer.addChild(container);
  return { container, g };
}

function createBodyNode(layer, bodyName, meta, color, onHover, onClick) {
  const container = new Container();
  container.eventMode = 'static';
  container.cursor = 'pointer';

  const glow = new Graphics();
  glow.circle(0, 0, meta.size + 4);
  glow.fill({ color, alpha: 0.15 });

  const circle = new Graphics();
  circle.circle(0, 0, meta.size);
  circle.fill({ color });

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
  glyph.position.set(0, -(meta.size + 10));

  const rxLabel = new Text({
    text: 'Rx',
    style: {
      fontFamily: 'DM Mono, monospace',
      fontSize: 8,
      fill: 0x7b5ea7,
    },
  });
  rxLabel.anchor.set(0.5);
  rxLabel.position.set(meta.size + 6, -(meta.size + 2));
  rxLabel.visible = false;

  container.addChild(glow, circle, glyph, rxLabel);
  layer.addChild(container);

  const node = { container, glow, circle, glyph, rxLabel, meta, color, _retrograde: false };

  container.on('pointerover', () => {
    glow.clear();
    glow.circle(0, 0, meta.size + 8);
    glow.fill({ color, alpha: 0.3 });
    onHover?.(bodyName, container.x, container.y, node._pos);
  });

  container.on('pointerout', () => {
    glow.clear();
    glow.circle(0, 0, meta.size + 4);
    glow.fill({ color, alpha: 0.15 });
    onHover?.(null);
  });

  container.on('pointerdown', () => onClick?.(bodyName));

  return node;
}

function updateRetrograde(node, isRetrograde) {
  if (node._retrograde === isRetrograde) return;
  node._retrograde = isRetrograde;

  node.circle.clear();
  node.circle.circle(0, 0, node.meta.size);
  node.circle.fill({ color: node.color });

  if (isRetrograde) {
    node.circle.circle(0, 0, node.meta.size);
    node.circle.stroke({ color: 0x7b5ea7, alpha: 0.9, width: 1.5 });
  }

  node.rxLabel.visible = isRetrograde;
}

// Factory — call once per layer mount, returns an update function
export function createBodyLayer(layer, onHover, onClick) {
  const nodes = new Map();
  let earthNode = null;

  return function update(centerX, centerY, positions, visibleBodies) {
    // Earth — created once, repositioned each update
    if (!earthNode) {
      earthNode = createEarthNode(layer);
    }
    earthNode.container.position.set(centerX, centerY);

    // Remove nodes for bodies that are no longer visible
    for (const [name, node] of nodes) {
      if (!visibleBodies.includes(name)) {
        layer.removeChild(node.container);
        nodes.delete(name);
      }
    }

    for (const bodyName of visibleBodies) {
      const meta = bodiesData[bodyName];
      const pos = positions[bodyName];
      if (!meta || !pos) continue;

      const { x, y } = lonToXY(pos.lon, meta.orbit_radius, centerX, centerY);

      let node = nodes.get(bodyName);
      if (!node) {
        node = createBodyNode(
          layer,
          bodyName,
          meta,
          hexToNumber(meta.color),
          onHover,
          onClick
        );
        nodes.set(bodyName, node);
      }

      // Position update — just a matrix write, no Graphics rebuild
      node.container.position.set(x, y);
      node._pos = pos;

      updateRetrograde(node, pos.retrograde);
    }
  };
}
