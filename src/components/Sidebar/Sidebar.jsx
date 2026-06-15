import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useOrreryStore from '../../store/useOrreryStore';
import ArticleCard from './ArticleCard';
import writings from '../../data/writings.json';
import bodies from '../../data/bodies.json';
import { getSignForLon, getDegreeInSign } from '../Orrery/drawZodiac';

function useEphemerisPosition(ephemeris, activeDate, selectedBody) {
  if (!ephemeris || !selectedBody) return null;
  const key = activeDate.toISOString().slice(0, 10);
  return ephemeris?.days?.[key]?.[selectedBody] ?? null;
}

function useIsMobile() {
  return window.innerWidth < 640;
}

export default function Sidebar({ ephemeris }) {
  const sidebarOpen = useOrreryStore((s) => s.sidebarOpen);
  const selectedBody = useOrreryStore((s) => s.selectedBody);
  const activeDate = useOrreryStore((s) => s.activeDate);
  const closeSidebar = useOrreryStore((s) => s.closeSidebar);

  const sidebarRef = useRef(null);
  const pos = useEphemerisPosition(ephemeris, activeDate, selectedBody);
  const isMobile = useIsMobile();

  const meta = selectedBody ? bodies[selectedBody] : null;
  const articles = selectedBody
    ? writings.filter((w) => w.body === selectedBody).sort(
        (a, b) => new Date(b.date_written) - new Date(a.date_written)
      )
    : [];

  // Close on outside click
  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        closeSidebar();
      }
    };
    setTimeout(() => document.addEventListener('pointerdown', handler), 50);
    return () => document.removeEventListener('pointerdown', handler);
  }, [sidebarOpen, closeSidebar]);

  const slideVariants = isMobile
    ? {
        hidden: { y: '100%', opacity: 0 },
        visible: { y: 0, opacity: 1 },
        exit: { y: '100%', opacity: 0 },
      }
    : {
        hidden: { x: '100%', opacity: 0 },
        visible: { x: 0, opacity: 1 },
        exit: { x: '100%', opacity: 0 },
      };

  const sidebarStyle = isMobile
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '65vh',
        borderRadius: '16px 16px 0 0',
        overflowY: 'auto',
      }
    : {
        position: 'fixed',
        top: 0,
        right: 0,
        width: 380,
        height: '100vh',
        overflowY: 'auto',
      };

  return (
    <AnimatePresence>
      {sidebarOpen && selectedBody && (
        <motion.div
          ref={sidebarRef}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={slideVariants}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          style={{
            ...sidebarStyle,
            background: '#1e1228',
            borderLeft: isMobile ? 'none' : '1px solid #c9a96e33',
            borderTop: isMobile ? '1px solid #c9a96e33' : 'none',
            zIndex: 200,
            padding: '28px 24px 40px',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: '"Noto Sans Symbols 2", serif', fontSize: 32, color: '#c9a96e', lineHeight: 1 }}>
                {meta?.glyph}
              </div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#f2e9d8', marginTop: 4 }}>
                {meta?.label}
              </div>
              {pos && (
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#c9a96e', marginTop: 6, letterSpacing: '0.06em' }}>
                  {getDegreeInSign(pos.lon)}° {getSignForLon(pos.lon)}
                  {pos.retrograde ? ' Rx' : ''}
                </div>
              )}
            </div>
            <button
              onClick={closeSidebar}
              style={{
                background: 'none',
                border: '1px solid #c9a96e44',
                borderRadius: 6,
                color: '#c9a96e',
                fontFamily: 'DM Mono, monospace',
                fontSize: 11,
                padding: '5px 10px',
                cursor: 'pointer',
              }}
            >
              close
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#c9a96e22', marginBottom: 20 }} />

          {/* Articles */}
          {articles.length === 0 ? (
            <p style={{ fontFamily: 'Spectral, serif', fontSize: 14, color: '#f2e9d866', fontStyle: 'italic' }}>
              No writings yet for {meta?.label}.
            </p>
          ) : (
            articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
