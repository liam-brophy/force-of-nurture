import { useEffect, useRef } from 'react';
import { Application, Container } from 'pixi.js';

export function usePixiApp(canvasRef) {
  const appRef = useRef(null);
  const layersRef = useRef({});

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const app = new Application();

    app.init({
      canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x000000,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(() => {
      appRef.current = app;

      // Background sits directly on stage — not inside the zoom/pan root —
      // so stars stay fixed to the viewport like the sky should.
      const bgContainer = new Container();
      app.stage.addChild(bgContainer);

      const root = new Container();
      app.stage.addChild(root);

      const layers = {
        background: bgContainer,
        zodiac: new Container(),
        orbits: new Container(),
        bodies: new Container(),
        aspects: new Container(),
        ui: new Container(),
      };

      for (const key of ['zodiac', 'orbits', 'bodies', 'aspects', 'ui']) {
        root.addChild(layers[key]);
      }

      layersRef.current = layers;
      layersRef.current._root = root;
      layersRef.current._ready = true;

      canvas.dispatchEvent(new CustomEvent('pixi-ready'));
    });

    let resizeTimer = null;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!appRef.current) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        appRef.current.renderer.resize(w, h);
        canvas.dispatchEvent(new CustomEvent('pixi-resize', { detail: { w, h } }));
      }, 120);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
      appRef.current?.destroy(false, { children: true });
      appRef.current = null;
    };
  }, []);

  return { appRef, layersRef };
}
