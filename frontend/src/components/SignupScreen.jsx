import React, { useState } from 'react';
import { Sparkles, Building2, ArrowLeft } from 'lucide-react';

const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';

export default function SignupScreen({ onSignup, onBackToLogin }) {
  const [orgName, setOrgName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{4,8}$/.test(pin)) {
      setError('PINは4〜8桁の数字で入力してください');
      return;
    }
    if (pin !== pin2) {
      setError('PINが一致しません');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_name: orgName.trim(),
          owner_name: ownerName.trim(),
          email: loginId.trim(),
          pin: pin.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '登録に失敗しました');
        return;
      }
      onSignup(data);
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

        <div style={{ fontSize: '0.85rem', color: '#48564c', textAlign: 'center', marginTop: '-8px' }}>
          <Building2 size={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
          組織を新しく登録します（あなたがオーナーになります）
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-label">
            組織名（会社名・チーム名）
            <input
              type="text"
              className="login-input"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="例: 株式会社サンプル"
              required
              autoFocus
            />
          </label>
          <label className="login-label">
            あなたの氏名
            <input
              type="text"
              className="login-input"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="例: 山田太郎"
              required
            />
          </label>
          <label className="login-label">
            ID（メールアドレス）
            <input
              type="text"
              className="login-input"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
              placeholder="ログインに使うID"
              required
            />
          </label>
          <label className="login-label">
            PIN（4〜8桁の数字）
            <input
              type="password"
              inputMode="numeric"
              className="login-input"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          <label className="login-label">
            PIN（確認）
            <input
              type="password"
              inputMode="numeric"
              className="login-input"
              value={pin2}
              onChange={(e) => setPin2(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-submit-btn" disabled={submitting}>
            {submitting ? '登録中…' : '組織を登録する'}
          </button>

          <button
            type="button"
            className="login-back-link"
            onClick={onBackToLogin}
          >
            <ArrowLeft size={14} /> すでにアカウントをお持ちの方はこちら
          </button>
        </form>
      </div>
    </div>
  );
}
