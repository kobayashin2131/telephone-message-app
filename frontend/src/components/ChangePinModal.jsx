import React, { useState } from 'react';
import { X, KeyRound } from 'lucide-react';

const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';

export default function ChangePinModal({ auth, onClose }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPin2, setNewPin2] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{4,8}$/.test(newPin)) {
      setError('新しいPINは4〜8桁の数字で入力してください');
      return;
    }
    if (newPin !== newPin2) {
      setError('新しいPINが一致しません');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ current_pin: currentPin, new_pin: newPin })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'PINの変更に失敗しました');
        return;
      }
      alert('PINを変更しました');
      onClose();
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '360px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <KeyRound size={20} color="#7d68a8" />
            PINを変更
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">現在のPIN</label>
            <input
              type="password"
              inputMode="numeric"
              className="form-input"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">新しいPIN（4〜8桁の数字）</label>
            <input
              type="password"
              inputMode="numeric"
              className="form-input"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">新しいPIN（確認）</label>
            <input
              type="password"
              inputMode="numeric"
              className="form-input"
              value={newPin2}
              onChange={(e) => setNewPin2(e.target.value)}
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>キャンセル</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? '変更中…' : '変更する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
