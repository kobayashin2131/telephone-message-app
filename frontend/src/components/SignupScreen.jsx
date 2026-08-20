import React, { useState } from 'react';
import { Sparkles, Building2, ArrowLeft, Check, Copy } from 'lucide-react';

const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';
const SUBDOMAIN_BASE = 'easystance.app';

export default function SignupScreen({ onSignup, onBackToLogin }) {
  const [orgName, setOrgName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState(null); // null | 'checking' | 'available' | 'unavailable'
  const [slugReason, setSlugReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { data, loginUrl } once signup succeeds

  const checkSlug = async (value) => {
    const cleaned = value.trim().toLowerCase();
    if (!cleaned) { setSlugStatus(null); setSlugReason(''); return; }
    setSlugStatus('checking');
    try {
      const res = await fetch(`${API_BASE}/auth/check-slug?slug=${encodeURIComponent(cleaned)}`);
      const data = await res.json();
      setSlugStatus(data.available ? 'available' : 'unavailable');
      setSlugReason(data.reason || (data.available ? '' : 'このURLは既に使われています'));
    } catch {
      setSlugStatus(null);
      setSlugReason('');
    }
  };

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
    if (slug.trim() && slugStatus === 'unavailable') {
      setError('専用URLを他の文字列に変更してください');
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
          pin: pin.trim(),
          slug: slug.trim().toLowerCase()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '登録に失敗しました');
        return;
      }
      if (data.login_url) {
        setResult(data);
      } else {
        onSignup(data);
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-brand">
            <div className="suite-logo-icon">
              <Check size={20} color="#fff" />
            </div>
            <div className="suite-brand-text">
              <span className="suite-title">登録完了</span>
              <span className="suite-subtitle">Suite Pro</span>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#48564c', lineHeight: 1.6 }}>
            御社専用のログインURLができました。今後はこちらのURLからアクセスしてください（ブックマーク推奨）。
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px',
            border: '1px solid var(--border-strong)', borderRadius: '8px', background: '#f8f5ef',
            fontSize: '0.88rem', fontWeight: 700, wordBreak: 'break-all'
          }}>
            {result.login_url}
            <button
              type="button"
              className="btn-secondary"
              style={{ marginLeft: 'auto', flexShrink: 0, padding: '6px' }}
              onClick={() => navigator.clipboard?.writeText(result.login_url)}
              title="コピー"
            >
              <Copy size={14} />
            </button>
          </div>
          <button type="button" className="login-submit-btn" onClick={() => onSignup(result)}>
            続ける
          </button>
        </div>
      </div>
    );
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
            会社専用URL（任意・後から設定も可）
            <input
              type="text"
              className="login-input"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugStatus(null); }}
              onBlur={(e) => checkSlug(e.target.value)}
              placeholder="例: sample-company"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <div style={{ fontSize: '0.72rem', fontWeight: 400, color: slugStatus === 'unavailable' ? '#c2604f' : '#66766c' }}>
              {slug.trim()
                ? `https://${slug.trim().toLowerCase()}.${SUBDOMAIN_BASE}`
                : '入力すると、この下にプレビューが表示されます'}
              {slugStatus === 'checking' && ' （確認中…）'}
              {slugStatus === 'available' && ' （このURLは使用できます）'}
              {slugStatus === 'unavailable' && ` （${slugReason}）`}
            </div>
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
              オーナーのIDは有効なメールアドレスをご登録ください（今後のプラン・お支払いに関するご連絡に使用します）
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
