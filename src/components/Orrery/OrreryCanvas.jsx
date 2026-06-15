import { useEffect, useRef, useCallback, useState } from 'react';
import { Container } from 'pixi.js';
import { usePixiApp } from './usePixiApp';
import { drawBodies } from './drawBodies';
import { drawOrbits } from './drawOrbits';
import { drawZodiac, getSignForLon } from './drawZodiac';
import useOrreryStore from '../../store/useOrreryStore';
import bodiesData from '../../data/bodies.json';

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getCenter(app) {
  return {
    cx: app.screen.width / 2,
    cy: app.screen.height / 2,
  };
}

function getVisibleBodies(showMoon, showMinorBodies) {
  return Object.entries(bodiesData)
    .filter(([name, meta]) => {
      if (name === 'Moon' && !showMoon) return false;
      if (meta.minor && !showMinorBodies) return false;
      return true;
    })
    .map(([name]) => name);
}

export default function OrreryCanvas({ ephemeris }) {
  const canvasRef = useRef(null);
  const { appRef, layersRef } = usePixiApp(canvasRef);
  const [tooltip, setTooltip] = useState(null);

  const showZodiac = useOrreryStore((s) => s.showZodiac);
  const showOrbits = useOrreryStore((s) => s.showOrbits);
  const showMoon = useOrreryStore((s) => s.showMoon);
  const showMinorBodies = useOrreryStore((s) => s.showMinorBodies);
  const activeDate = useOrreryStore((s) => s.activeDate);
  const setSelectedBody = useOrreryStore((s) => s.setSelectedBody);

  const prevPositionsRef = useRef(null);
  const animFrameRef = useRef(null);

  const redraw = useCallback(() => {
    const app = appRef.current;
    const layers = layersRef.current;
    if (!app || !layers._ready) return;

    const { cx, cy } = getCenter(app);
    const key = dateKey(activeDate);
    const positions = ephemeris?.days?.[key];
    if (!positions) return;

    const visibleBodies = getVisibleBodies(showMoon, showMinorBodies);

    // Orbits
    layers.orbits.visible = true;
    drawOrbits(layers.orbits, cx, cy, visibleBodies);

    // Zodiac
    layers.zodiac.visible = showZodiac;
    if (showZodiac) {
      const occupiedSigns = visibleBodies
        .map((b) => positions[b])
        .filter(Boolean)
        .map((p) => getSignForLon(p.lon));
      drawZodiac(layers.zodiac, cx, cy, [...new Set(occupiedSigns)]);
    }

    // Bodies — with transition if previous positions exist
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prev = prevPositionsRef.current;

    if (prev && !prefersReducedMotion) {
      const dateDelta = Math.abs((activeDate - (prevPositionsRef._date || activeDate)) / 86400000);
      if (dateDelta > 30) {
        drawBodies(layers.bodies, cx, cy, positions, visibleBodies, handleHover, setSelectedBody);
      } else {
        animateBodies(layers, cx, cy, prev, positions, visibleBodies, app);
      }
    } else {
      drawBodies(layers.bodies, cx, cy, positions, visibleBodies, handleHover, setSelectedBody);
    }

    prevPositionsRef.current = positions;
    prevPositionsRef._date = activeDate;
  }, [activeDate, showZodiac, showOrbits, showMoon, showMinorBodies, ephemeris, setSelectedBody]);

  function animateBodies(layers, cx, cy, fromPos, toPos, visibleBodies, app) {
    const duration = 600;
    const start = performance.now();

    if (animFrameRef.current) app.ticker.remove(animFrameRef.current);

    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      const interpolated = {};
      for (const body of visibleBodies) {
        const from = fromPos[body];
        const to = toPos[body];
        if (!from || !to) continue;

        let delta = to.lon - from.lon;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        interpolated[body] = {
          lon: from.lon + delta * eased,
          retrograde: to.retrograde,
        };
      }

      drawBodies(layers.bodies, cx, cy, interpolated, visibleBodies, handleHover, handleBodyClick);

      if (t >= 1) {
        app.ticker.remove(tick);
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = tick;
    app.ticker.add(tick);
  }

  function handleHover(bodyName, x, y, pos) {
    if (!bodyName) {
      setTooltip(null);
      return;
    }
    setTooltip({ bodyName, x, y, pos });
  }

  function handleBodyClick(bodyName) {
    setSelectedBody(bodyName);
  }

  // Listen for pixi-ready event, then draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onReady = () => redraw();
    canvas.addEventListener('pixi-ready', onReady);
    return () => canvas.removeEventListener('pixi-ready', onReady);
  }, [redraw]);

  // Redraw when store or date changes
  useEffect(() => {
    redraw();
  }, [redraw]);

  // Zoom & pan setup
  useEffect(() => {
    const app = appRef.current;
    const layers = layersRef.current;
    if (!app || !layers._root) return;

    const root = layers._root;
    let isPanning = false;
    let lastPointer = { x: 0, y: 0 };

    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.3, Math.min(3, root.scale.x * factor));
      root.scale.set(newScale);
    };

    const onPointerDown = (e) => {
      isPanning = true;
      lastPointer = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e) => {
      if (!isPanning) return;
      root.x += e.clientX - lastPointer.x;
      root.y += e.clientY - lastPointer.y;
      lastPointer = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => { isPanning = false; };

    const el = app.canvas;
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [appRef.current]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 16,
            top: tooltip.y - 8,
            background: 'rgba(61,43,94,0.95)',
            border: '1px solid #c9a96e',
            borderRadius: 8,
            padding: '6px 12px',
            color: '#f2e9d8',
            fontFamily: 'DM Mono, monospace',
            fontSize: 12,
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16 }}>
            {bodiesData[tooltip.bodyName]?.glyph} {tooltip.bodyName}
          </span>
          <br />
          {tooltip.pos.lon.toFixed(1)}°{tooltip.pos.retrograde ? ' ℞' : ''}
        </div>
      )}
    </div>
  );
}
