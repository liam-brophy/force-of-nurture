import { useState, useEffect } from 'react';
import OrreryCanvas from './components/Orrery/OrreryCanvas';
import TogglePanel from './components/Controls/TogglePanel';
import TimelineScrubber from './components/Controls/TimelineScrubber';
import Sidebar from './components/Sidebar/Sidebar';

export default function App() {
  const [ephemeris, setEphemeris] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/data/ephemeris.json')
      .then((r) => {
        if (!r.ok) throw new Error('ephemeris.json not found — run npm run generate-ephemeris first');
        return r.json();
      })
      .then((data) => {
        setEphemeris(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={centerStyle}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#c9a96e' }}>
          Loading the heavens…
        </div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#f2e9d855', marginTop: 12 }}>
          fetching ephemeris data
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={centerStyle}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: '#c1440e' }}>
          Ephemeris not found
        </div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#f2e9d888', marginTop: 12, maxWidth: 400, textAlign: 'center' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      <OrreryCanvas ephemeris={ephemeris} />
      <TogglePanel />
      <TimelineScrubber />
      <Sidebar ephemeris={ephemeris} />
    </>
  );
}

const centerStyle = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0d0d1a',
};
