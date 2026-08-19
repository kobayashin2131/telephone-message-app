import React, { useState, useEffect, useRef } from 'react';
import { Palette, Check } from 'lucide-react';

export const TONES = [
  { id: 'sage', label: 'セージ', swatch: '#7aab8f' },
  { id: 'lavender', label: 'ラベンダー', swatch: '#9b84c4' },
  { id: 'mist', label: 'ミスト', swatch: '#6b8fa3' },
];

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState(() => localStorage.getItem('callsync_tone') || 'sage');
  const ref = useRef(null);

  useEffect(() => {
    if (tone === 'sage') {
      document.documentElement.removeAttribute('data-tone');
    } else {
      document.documentElement.setAttribute('data-tone', tone);
    }
    localStorage.setItem('callsync_tone', tone);
  }, [tone]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="theme-picker" ref={ref}>
      <button className="btn-suite-icon" onClick={() => setOpen(o => !o)} title="配色を選ぶ">
        <Palette size={16} />
      </button>
      {open && (
        <div className="theme-picker-popover">
          {TONES.map(t => (
            <button
              key={t.id}
              className="theme-swatch-btn"
              onClick={() => { setTone(t.id); setOpen(false); }}
            >
              <span className="theme-swatch-dot" style={{ background: t.swatch }} />
              <span>{t.label}</span>
              {tone === t.id && <Check size={14} style={{ marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
