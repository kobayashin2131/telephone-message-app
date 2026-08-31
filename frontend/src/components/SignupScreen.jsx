import React, { useState } from 'react';
import { Sparkles, Building2, ArrowLeft, Mail } from 'lucide-react';

const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';

function PendingVerificationScreen({ email, onBackToLogin }) {
  const [newEmail, setNewEmail] = useState(email);
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResend = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, new_email: editing ? newEmail.trim() : undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '再送に失敗しました');
        return;
      }
      setMessage(`${data.email} に確認メールを再送しました。`);
      setEditing(false);
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="suite-logo-icon">
            <Mail size={20} color="#fff" />
          </div>
          <div className="suite-brand-text">
            <span className="suite-title">確認メール</span>
            <span className="suite-subtitle">Suite Pro</span>
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#48564c', lineHeight: 1.7, textAlign: 'center' }}>
          <strong>{email}</strong> 宛てに確認メールを送信しました。<br />
          メール内のリンクをクリックすると、ログインできるようになります。
        </div>

        {message && <div style={{ fontSize: '0.8rem', color: '#4a7361', textAlign: 'center' }}>{message}</div>}
        {error && <div className="login-error">{error}</div>}

        {!editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <button type="button" className="btn-secondary" onClick={handleResend} disabled={sending}>
              {sending ? '送信中…' : 'メールを再送する'}
            </button>
            <button
              type="button"
              className="login-back-link"
              style={{ fontSize: '0.78rem' }}
              onClick={() => setEditing(true)}
            >
              アドレスを間違えた方はこちら
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleResend}>
            <label className="login-label">
              正しいメールアドレス
              <input
                type="email"
                className="login-input"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="login-submit-btn" disabled={sending}>
              {sending ? '送信中…' : 'このアドレスに送り直す'}
            </button>
          </form>
        )}

        <button
          type="button"
          className="login-back-link"
          onClick={onBackToLogin}
        >
          <ArrowLeft size={14} /> ログイン画面に戻る
        </button>
      </div>
    </div>
  );
}

export default function SignupScreen({ onSignup, onBackToLogin }) {
  const [orgName, setOrgName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginId.trim())) {
      setError('オーナーのIDは有効なメールアドレスを入力してください（今後の請求連絡に使用します）');
      return;
    }
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
      if (data.pending_verification) {
        setPendingEmail(data.email);
      } else {
        onSignup(data);
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (pendingEmail) {
    return <PendingVerificationScreen email={pendingEmail} onBackToLogin={onBackToLogin} />;
  }

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
              type="email"
              className="login-input"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
              placeholder="例: yamada@example.com"
              required
            />
            <div style={{ fontSize: '0.72rem', color: '#66766c', fontWeight: 400 }}>
              登録後、このアドレス宛てに確認メールを送ります。リンクをクリックするまでログインできません。
            </div>
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
