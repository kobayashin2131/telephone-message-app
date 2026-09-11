import React, { useState } from 'react';
import { Sparkles, LogIn } from 'lucide-react';

const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';

export default function LoginScreen({ onLogin, onGoToSignup }) {
  const [loginId, setLoginId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginId.trim(), pin: pin.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ログインに失敗しました');
        return;
      }
      onLogin(data);
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="suite-logo-icon">
            <Sparkles size={20} color="#fff" />
          </div>
          <div className="suite-brand-text">
            <span className="suite-title">Connect</span>
            <span className="suite-subtitle">Suite Pro</span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-label">
            ID
            <input
              type="text"
              className="login-input"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
              placeholder="社員ID・メールアドレス"
              required
            />
          </label>
          <label className="login-label">
            PIN
            <input
              type="password"
              inputMode="numeric"
              className="login-input"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoComplete="current-password"
              placeholder="4〜8桁の数字"
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-submit-btn" disabled={submitting}>
            <LogIn size={16} />
            <span>{submitting ? 'ログイン中…' : 'ログイン'}</span>
          </button>

          <button type="button" className="login-back-link" onClick={onGoToSignup}>
            組織を新しく登録する方はこちら
          </button>
        </form>
      </div>
    </div>
  );
}
