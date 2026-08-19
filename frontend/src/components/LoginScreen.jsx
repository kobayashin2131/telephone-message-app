import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, LogIn } from 'lucide-react';

const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function LoginScreen({ onLogin }) {
  const [loginId, setLoginId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const googleButtonRef = useRef(null);

  const handleGoogleCredential = async (response) => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Googleログインに失敗しました');
        return;
      }
      onLogin(data);
    } catch {
      setError('通信エラーが発生しました');
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id || !googleButtonRef.current) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      width: 320,
      text: 'signin_with',
      locale: 'ja'
    });
  }, []);

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

        {GOOGLE_CLIENT_ID && (
          <>
            <div className="login-google-btn" ref={googleButtonRef} />
            <div className="login-divider"><span>または</span></div>
          </>
        )}

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
        </form>
      </div>
    </div>
  );
}
