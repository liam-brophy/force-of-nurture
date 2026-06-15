import useOrreryStore from '../../store/useOrreryStore';
import { format } from 'date-fns';

const BTN = {
  background: 'none',
  border: '1px solid #c9a96e55',
  borderRadius: 4,
  color: '#c9a96e',
  fontFamily: 'DM Mono, monospace',
  fontSize: 11,
  padding: '4px 8px',
  cursor: 'pointer',
  letterSpacing: '0.05em',
  transition: 'border-color 0.15s, color 0.15s',
};

function StepBtn({ label, unit, dir }) {
  const stepDate = useOrreryStore((s) => s.stepDate);
  return (
    <button style={BTN} onClick={() => stepDate(unit, dir)}>
      {label}
    </button>
  );
}

export default function TimelineScrubber() {
  const activeDate = useOrreryStore((s) => s.activeDate);
  const setDate = useOrreryStore((s) => s.setDate);
  const setToday = useOrreryStore((s) => s.setToday);

  const handleInput = (e) => {
    const d = new Date(e.target.value + 'T12:00:00Z');
    if (!isNaN(d)) setDate(d);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        background: 'rgba(61,43,94,0.85)',
        border: '1px solid #c9a96e55',
        borderRadius: 12,
        padding: '12px 20px',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      {/* Year step */}
      <StepBtn label="−yr" unit="year" dir={-1} />
      <StepBtn label="−mo" unit="month" dir={-1} />
      <StepBtn label="−day" unit="day" dir={-1} />

      {/* Date display / picker */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{ color: '#f2e9d8', fontFamily: 'Cormorant Garamond, serif', fontSize: 18 }}>
          {format(activeDate, 'MMMM d, yyyy')}
        </span>
        <input
          type="date"
          min="2010-01-01"
          max="2035-12-31"
          value={format(activeDate, 'yyyy-MM-dd')}
          onChange={handleInput}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#c9a96e',
            fontFamily: 'DM Mono, monospace',
            fontSize: 10,
            cursor: 'pointer',
            opacity: 0.7,
            outline: 'none',
          }}
        />
      </div>

      <StepBtn label="+day" unit="day" dir={1} />
      <StepBtn label="+mo" unit="month" dir={1} />
      <StepBtn label="+yr" unit="year" dir={1} />

      <button
        style={{ ...BTN, borderColor: '#7b5ea7', color: '#b59fca', marginLeft: 8 }}
        onClick={setToday}
      >
        Today
      </button>
    </div>
  );
}
