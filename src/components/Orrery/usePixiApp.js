import { useEffect, useRef } from 'react';
import { Application, Container } from 'pixi.js';

export function usePixiApp(canvasRef) {
  const appRef = useRef(null);
  const layersRef = useRef({});

  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new Application();

    app.init({
      canvas: canvasRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x0d0d1a,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(() => {
      appRef.current = app;

      const root = new Container();
      app.stage.addChild(root);

      const layers = {
        background: new Container(),
        zodiac: new Container(),
        orbits: new Container(),
        bodies: new Container(),
        aspects: new Container(),
        ui: new Container(),
      };

      for (const layer of Object.values(layers)) {
        root.addChild(layer);
      }

      layersRef.current = layers;
      layersRef.current._root = root;
      layersRef.current._app = app;
      layersRef.current._ready = true;

      // Dispatch event so components know pixi is ready
      canvasRef.current?.dispatchEvent(new CustomEvent('pixi-ready'));
    });

    const handleResize = () => {
      if (!appRef.current) return;
      appRef.current.renderer.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      appRef.current?.destroy(false, { children: true });
      appRef.current = null;
    };
  }, []);

  return { appRef, layersRef };
}
