import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useOrreryStore from '../../store/useOrreryStore';

const toggles = [
  { key: 'showZodiac',      label: 'Zodiac Ring',   action: 'toggleZodiac' },
  { key: 'showOrbits',      label: 'Orbit Rings',   action: 'toggleOrbits' },
  { key: 'showAspects',     label: 'Aspects',        action: 'toggleAspects' },
  { key: 'showMoon',        label: 'Moon',           action: 'toggleMoon' },
  { key: 'showMinorBodies', label: 'Minor Bodies',   action: 'toggleMinorBodies' },
];

export default function TogglePanel() {
  const [open, setOpen] = useState(true);
  const store = useOrreryStore();

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        left: 24,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'rgba(61,43,94,0.85)',
          border: '1px solid #c9a96e55',
          borderRadius: open ? '8px 8px 0 0' : 8,
          padding: '8px 14px',
          color: '#c9a96e',
          fontFamily: 'DM Mono, monospace',
          fontSize: 11,
          cursor: 'pointer',
          letterSpacing: '0.08em',
          backdropFilter: 'blur(8px)',
          textTransform: 'uppercase',
        }}
      >
        {open ? '▲ Layers' : '▼ Layers'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                background: 'rgba(61,43,94,0.85)',
                border: '1px solid #c9a96e55',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                padding: '8px 0',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {toggles.map(({ key, label, action }) => {
                const active = store[key];
                return (
                  <button
                    key={key}
                    onClick={() => store[action]()}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '7px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      color: active ? '#f2e9d8' : '#f2e9d855',
                      fontFamily: 'DM Mono, monospace',
                      fontSize: 11,
                      letterSpacing: '0.06em',
                      transition: 'color 0.15s',
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        border: `1px solid ${active ? '#c9a96e' : '#c9a96e55'}`,
                        background: active ? '#7b5ea7' : 'transparent',
                        display: 'inline-block',
                        flexShrink: 0,
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
