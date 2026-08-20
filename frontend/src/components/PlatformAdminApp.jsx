import React, { useState, useEffect } from 'react';
import { Sparkles, LogOut, Ban, RotateCcw, Trash2, Building2, HardDrive } from 'lucide-react';

const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';
const STORAGE_KEY = 'callsync_platform_auth';

function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function fmtDate(v) {
  if (!v) return '—';
  return new Date(v.replace(' ', 'T') + 'Z').toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtBytes(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function PlatformLoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/platform/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ログインに失敗しました');
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
            <span className="suite-subtitle">Platform Admin</span>
          </div>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-label">
            メールアドレス
            <input type="text" className="login-input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          <label className="login-label">
            パスワード
            <input type="password" className="login-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-submit-btn" disabled={submitting}>
            {submitting ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}

function OrgRow({ org, onCancel, onReactivate, onDelete, onEditStorage }) {
  const isCancelled = org.status === 'cancelled';
  const pct = Math.min(100, Math.round((org.storage_used_bytes / org.storage_limit_bytes) * 100));
  const isNearLimit = pct >= 80;
  return (
    <tr>
      <td>
        <div style={{ fontWeight: 700 }}>{org.name}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--ink-faint)' }}>ID: {org.id} ／ 作成日: {fmtDate(org.created_at)}</div>
      </td>
      <td>
        <span className={`platform-status-pill ${isCancelled ? 'cancelled' : 'active'}`}>
          {isCancelled ? '解約済み' : '運用中'}
        </span>
      </td>
      <td>{org.user_count}</td>
      <td>{org.department_count}</td>
      <td>{org.group_count}</td>
      <td>
        {org.call_memo_count}
        {org.pending_call_memo_count > 0 && <span className="platform-pending-badge">未対応{org.pending_call_memo_count}</span>}
      </td>
      <td style={{ minWidth: '140px', cursor: 'pointer' }} onClick={() => onEditStorage(org)} title="クリックで上限を変更">
        <div style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{fmtBytes(org.storage_used_bytes)}</span>
          <span style={{ color: 'var(--ink-faint)' }}>/ {fmtBytes(org.storage_limit_bytes)}</span>
        </div>
        <div className="platform-storage-bar">
          <div
            className="platform-storage-bar-fill"
            style={{ width: `${pct}%`, background: isNearLimit ? 'var(--status-pending)' : 'var(--status-resolved)' }}
          />
        </div>
      </td>
      <td style={{ fontSize: '0.78rem' }}>
        {fmtDate(
          [org.last_message_at, org.last_call_memo_at].filter(Boolean).sort().pop()
        )}
      </td>
      <td>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          {isCancelled ? (
            <>
              <button className="btn-secondary" title="運用を再開する" onClick={() => onReactivate(org)}>
                <RotateCcw size={14} />
              </button>
              <button className="btn-secondary" style={{ color: 'var(--status-pending)' }} title="完全に削除する" onClick={() => onDelete(org)}>
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <button className="btn-secondary" title="解約済みにする" onClick={() => onCancel(org)}>
              <Ban size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function Dashboard({ auth, onLogout }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrgs = async () => {
    try {
      const res = await fetch(`${API_BASE}/platform/organizations`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      setOrgs(data);
    } catch {
      setError('組織一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrgs(); }, []);

  const handleCancel = async (org) => {
    if (!window.confirm(`「${org.name}」を解約済みにします。データは残ります（後で運用を再開できます）。よろしいですか？`)) return;
    await fetch(`${API_BASE}/platform/organizations/${org.id}/cancel`, {
      method: 'POST', headers: { Authorization: `Bearer ${auth.token}` }
    });
    fetchOrgs();
  };

  const handleReactivate = async (org) => {
    if (!window.confirm(`「${org.name}」の運用を再開します。よろしいですか？`)) return;
    await fetch(`${API_BASE}/platform/organizations/${org.id}/reactivate`, {
      method: 'POST', headers: { Authorization: `Bearer ${auth.token}` }
    });
    fetchOrgs();
  };

  const handleDelete = async (org) => {
    const typed = window.prompt(
      `「${org.name}」を完全に削除します。この操作は取り消せません。\n削除するには組織名を正確に入力してください:`
    );
    if (typed !== org.name) {
      if (typed !== null) alert('組織名が一致しませんでした。削除を中止します。');
      return;
    }
    const res = await fetch(`${API_BASE}/platform/organizations/${org.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || '削除に失敗しました');
      return;
    }
    fetchOrgs();
  };

  const handleEditStorage = async (org) => {
    const currentGB = (org.storage_limit_bytes / (1024 * 1024 * 1024)).toFixed(1);
    const typed = window.prompt(`「${org.name}」のストレージ上限（GB）を入力してください`, currentGB);
    if (typed === null) return;
    const gb = Number(typed);
    if (!Number.isFinite(gb) || gb <= 0) {
      alert('数値（GB）を入力してください');
      return;
    }
    const res = await fetch(`${API_BASE}/platform/organizations/${org.id}/storage-limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ storage_limit_bytes: Math.round(gb * 1024 * 1024 * 1024) })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || '更新に失敗しました');
      return;
    }
    fetchOrgs();
  };

  return (
    <div className="suite-root">
      <header className="suite-header">
        <div className="suite-left">
          <div className="suite-brand">
            <div className="suite-logo-icon"><Sparkles size={18} color="#fff" /></div>
            <div className="suite-brand-text">
              <span className="suite-title">Connect</span>
              <span className="suite-subtitle">Platform Admin</span>
            </div>
          </div>
        </div>
        <div className="suite-right">
          <span style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>{auth.admin.email}</span>
          <button className="suite-user-logout-btn" onClick={onLogout} title="ログアウト">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="suite-app-body" style={{ overflowY: 'auto', padding: '24px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Building2 size={20} /> 組織一覧（全{orgs.length}件）
        </h2>

        {loading ? (
          <p>読み込み中…</p>
        ) : error ? (
          <p style={{ color: 'var(--status-pending)' }}>{error}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="platform-org-table">
              <thead>
                <tr>
                  <th>組織</th>
                  <th>状態</th>
                  <th>ユーザー</th>
                  <th>部門</th>
                  <th>グループ</th>
                  <th>受電メモ</th>
                  <th>ストレージ</th>
                  <th>最終アクティビティ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orgs.map(org => (
                  <OrgRow
                    key={org.id}
                    org={org}
                    onCancel={handleCancel}
                    onReactivate={handleReactivate}
                    onDelete={handleDelete}
                    onEditStorage={handleEditStorage}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlatformAdminApp() {
  const [auth, setAuth] = useState(() => loadAuth());

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/platform/logout`, { method: 'POST', headers: { Authorization: `Bearer ${auth?.token}` } });
    } catch { /* ignore */ }
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  };

  if (!auth) return <PlatformLoginScreen onLogin={setAuth} />;
  return <Dashboard auth={auth} onLogout={handleLogout} />;
}
