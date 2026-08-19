import React, { useState, useEffect, useRef } from 'react';
import { Settings, Check } from 'lucide-react';

export const TONES = [
  { id: 'sage', label: 'セージ', swatch: '#7aab8f' },
  { id: 'lavender', label: 'ラベンダー', swatch: '#9b84c4' },
  { id: 'mist', label: 'ミスト', swatch: '#6b8fa3' },
];

export const SIZES = [
  { id: 'normal', label: '標準' },
  { id: 'large', label: '大きめ' },
  { id: 'xl', label: '特大' },
];

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState(() => localStorage.getItem('callsync_tone') || 'sage');
  const [size, setSize] = useState(() => localStorage.getItem('callsync_size') || 'normal');
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
    if (size === 'normal') {
      document.documentElement.removeAttribute('data-size');
    } else {
      document.documentElement.setAttribute('data-size', size);
    }
    localStorage.setItem('callsync_size', size);
  }, [size]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="theme-picker" ref={ref}>
      <button className="btn-suite-icon" onClick={() => setOpen(o => !o)} title="表示設定（配色・文字サイズ）">
        <Settings size={16} />
      </button>
      {open && (
        <div className="theme-picker-popover">
          <div className="theme-picker-section-label">配色</div>
          {TONES.map(t => (
            <button
              key={t.id}
              className="theme-swatch-btn"
              onClick={() => setTone(t.id)}
            >
              <span className="theme-swatch-dot" style={{ background: t.swatch }} />
              <span>{t.label}</span>
              {tone === t.id && <Check size={14} style={{ marginLeft: 'auto' }} />}
            </button>
          ))}

          <div className="theme-picker-divider" />

          <div className="theme-picker-section-label">文字サイズ</div>
          {SIZES.map(s => (
            <button
              key={s.id}
              className="theme-swatch-btn"
              onClick={() => setSize(s.id)}
            >
              <span>{s.label}</span>
              {size === s.id && <Check size={14} style={{ marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
