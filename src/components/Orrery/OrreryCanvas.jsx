import { useEffect, useRef, useCallback, useState } from 'react';
import { usePixiApp } from './usePixiApp';
import { createBodyLayer } from './drawBodies';
import { drawOrbits } from './drawOrbits';
import { drawZodiac, getSignForLon } from './drawZodiac';
import { initBackground } from './drawBackground';
import useOrreryStore from '../../store/useOrreryStore';
import bodiesData from '../../data/bodies.json';

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getCenter(app) {
  return { cx: app.screen.width / 2, cy: app.screen.height / 2 };
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

  // Persistent renderer refs — created once, updated each frame
  const bodyLayerRef = useRef(null);
  const bgControllerRef = useRef(null);
  const animFrameRef = useRef(null);

  const showZodiac = useOrreryStore((s) => s.showZodiac);
  const showOrbits = useOrreryStore((s) => s.showOrbits);
  const showMoon = useOrreryStore((s) => s.showMoon);
  const showMinorBodies = useOrreryStore((s) => s.showMinorBodies);
  const activeDate = useOrreryStore((s) => s.activeDate);
  const setSelectedBody = useOrreryStore((s) => s.setSelectedBody);

  const prevDateRef = useRef(null);
  const prevPositionsRef = useRef(null);

  // Keep a stable ref to the latest callbacks so event listeners
  // don't close over stale versions.
  const handleHover = useCallback((bodyName, x, y, pos) => {
    setTooltip(bodyName ? { bodyName, x, y, pos } : null);
  }, []);

  const redraw = useCallback(() => {
    const app = appRef.current;
    const layers = layersRef.current;
    if (!app || !layers._ready) return;

    const { cx, cy } = getCenter(app);
    const key = dateKey(activeDate);
    const positions = ephemeris?.days?.[key];
    if (!positions) return;

    const visibleBodies = getVisibleBodies(showMoon, showMinorBodies);

    // Orbits layer visibility
    layers.orbits.visible = showOrbits;
    if (showOrbits) drawOrbits(layers.orbits, cx, cy, visibleBodies);

    // Zodiac layer
    layers.zodiac.visible = showZodiac;
    if (showZodiac) {
      const occupiedSigns = visibleBodies
        .map((b) => positions[b])
        .filter(Boolean)
        .map((p) => getSignForLon(p.lon));
      drawZodiac(layers.zodiac, cx, cy, [...new Set(occupiedSigns)]);
    }

    // Bodies
    if (!bodyLayerRef.current) {
      bodyLayerRef.current = createBodyLayer(layers.bodies, handleHover, setSelectedBody);
    }

    const prevPositions = prevPositionsRef.current;
    const prevDate = prevDateRef.current;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prevPositions && prevDate && !prefersReducedMotion) {
      const dayDelta = Math.abs((activeDate - prevDate) / 86400000);
      if (dayDelta <= 30) {
        animateBodies(app, cx, cy, prevPositions, positions, visibleBodies);
      } else {
        bodyLayerRef.current(cx, cy, positions, visibleBodies);
      }
    } else {
      bodyLayerRef.current(cx, cy, positions, visibleBodies);
    }

    prevPositionsRef.current = positions;
    prevDateRef.current = activeDate;
  }, [activeDate, showZodiac, showOrbits, showMoon, showMinorBodies, ephemeris, setSelectedBody, handleHover]);

  // Keep a ref to the latest redraw so event listeners always call the current version
  const redrawRef = useRef(redraw);
  useEffect(() => { redrawRef.current = redraw; }, [redraw]);

  function animateBodies(app, cx, cy, fromPos, toPos, visibleBodies) {
    if (animFrameRef.current) {
      app.ticker.remove(animFrameRef.current);
      animFrameRef.current = null;
    }

    const duration = 600;
    const start = performance.now();
    const updateFn = bodyLayerRef.current;

    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      // Ease in-out quad
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

      // updateFn only moves existing containers — no object allocation
      updateFn(cx, cy, interpolated, visibleBodies);

      if (t >= 1) {
        app.ticker.remove(tick);
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = tick;
    app.ticker.add(tick);
  }

  // Wire up after PixiJS is ready
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onReady = () => {
      const app = appRef.current;
      const layers = layersRef.current;
      if (!app) return;

      // Star field init
      bgControllerRef.current = initBackground(layers.background, app);

      // Zoom & pan — set up here, once, when we know the app exists
      const root = layers._root;
      let isPanning = false;
      let lastPointer = { x: 0, y: 0 };

      const onWheel = (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        root.scale.set(Math.max(0.3, Math.min(4, root.scale.x * factor)));
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

      canvas.addEventListener('wheel', onWheel, { passive: false });
      canvas.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);

      // Store cleanup on the controller ref so the resize handler can skip it
      bgControllerRef._cleanup = () => {
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        bgControllerRef.current?.destroy();
      };

      redrawRef.current();
    };

    const onResize = (e) => {
      bgControllerRef.current?.resize(e.detail.w, e.detail.h);
      redrawRef.current();
    };

    canvas.addEventListener('pixi-ready', onReady);
    canvas.addEventListener('pixi-resize', onResize);

    return () => {
      canvas.removeEventListener('pixi-ready', onReady);
      canvas.removeEventListener('pixi-resize', onResize);
      bgControllerRef._cleanup?.();
    };
  }, []);

  // Re-run redraw when store state or date changes
  useEffect(() => {
    redraw();
  }, [redraw]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 16,
            top: tooltip.y - 8,
            background: 'rgba(20,10,36,0.96)',
            border: '1px solid #c9a96e',
            borderRadius: 8,
            padding: '6px 12px',
            color: '#f2e9d8',
            fontFamily: 'DM Mono, monospace',
            fontSize: 12,
            pointerEvents: 'none',
            zIndex: 100,
            backdropFilter: 'blur(4px)',
          }}
        >
          <span style={{ fontFamily: '"Noto Sans Symbols 2", serif', fontSize: 16 }}>
            {bodiesData[tooltip.bodyName]?.glyph}
          </span>{' '}
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16 }}>
            {tooltip.bodyName}
          </span>
          <br />
          {tooltip.pos.lon.toFixed(1)}&deg;{tooltip.pos.retrograde ? ' Rx' : ''}
        </div>
      )}
    </div>
  );
}
