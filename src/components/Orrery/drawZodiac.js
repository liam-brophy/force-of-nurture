import { Graphics, Text, Container } from 'pixi.js';

const SIGNS = [
  { name: 'Aries',       glyph: '♈', start: 0 },
  { name: 'Taurus',      glyph: '♉', start: 30 },
  { name: 'Gemini',      glyph: '♊', start: 60 },
  { name: 'Cancer',      glyph: '♋', start: 90 },
  { name: 'Leo',         glyph: '♌', start: 120 },
  { name: 'Virgo',       glyph: '♍', start: 150 },
  { name: 'Libra',       glyph: '♎', start: 180 },
  { name: 'Scorpio',     glyph: '♏', start: 210 },
  { name: 'Sagittarius', glyph: '♐', start: 240 },
  { name: 'Capricorn',   glyph: '♑', start: 270 },
  { name: 'Aquarius',    glyph: '♒', start: 300 },
  { name: 'Pisces',      glyph: '♓', start: 330 },
];

const DEG = Math.PI / 180;
const INNER_R = 480;
const OUTER_R = 530;
const LABEL_R = 505;
const GOLD = 0xc9a96e;
const GOLD_PULSE = 0xf5d98a;

export function drawZodiac(layer, centerX, centerY, occupiedSigns) {
  layer.removeChildren();

  for (const sign of SIGNS) {
    const occupied = occupiedSigns.includes(sign.name);
    const container = new Container();

    // Arc segment
    const g = new Graphics();
    const startAngle = (sign.start - 90) * DEG;
    const endAngle = (sign.start + 30 - 90) * DEG;

    g.arc(centerX, centerY, OUTER_R, startAngle, endAngle);
    g.arc(centerX, centerY, INNER_R, endAngle, startAngle, true);
    g.closePath();
    g.fill({ color: GOLD, alpha: occupied ? 0.12 : 0.04 });
    g.stroke({ color: GOLD, alpha: 0.3, width: 1 });
    container.addChild(g);

    // Divider spoke at start of each sign
    const spokeLine = new Graphics();
    const spokeAngle = (sign.start - 90) * DEG;
    spokeLine.moveTo(
      centerX + INNER_R * Math.cos(spokeAngle),
      centerY + INNER_R * Math.sin(spokeAngle)
    );
    spokeLine.lineTo(
      centerX + OUTER_R * Math.cos(spokeAngle),
      centerY + OUTER_R * Math.sin(spokeAngle)
    );
    spokeLine.stroke({ color: GOLD, alpha: 0.4, width: 1 });
    container.addChild(spokeLine);

    // Glyph label at midpoint of arc
    const midAngle = (sign.start + 15 - 90) * DEG;
    const lx = centerX + LABEL_R * Math.cos(midAngle);
    const ly = centerY + LABEL_R * Math.sin(midAngle);

    const label = new Text({
      text: sign.glyph,
      style: {
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: occupied ? 16 : 14,
        fill: occupied ? GOLD_PULSE : GOLD,
        align: 'center',
      },
    });
    label.anchor.set(0.5);
    label.position.set(lx, ly);

    if (occupied) {
      // Subtle pulsing via alpha animation handled in ticker elsewhere
      label.alpha = 1;
    } else {
      label.alpha = 0.7;
    }

    container.addChild(label);
    layer.addChild(container);
  }
}

export function getSignForLon(lon) {
  const idx = Math.floor(((lon % 360) + 360) % 360 / 30);
  return SIGNS[idx].name;
}

export function getDegreeInSign(lon) {
  return Math.floor(((lon % 360) + 360) % 360 % 30);
}

export { SIGNS };
