import React, { useState, useEffect } from 'react';
import { X, Settings, Users, Building2, Plus, Edit, Trash2, ShieldCheck, UserCheck, KeyRound, FileSpreadsheet, CreditCard, Copy } from 'lucide-react';

const COLORS = ['#7d68a8', '#6fa382', '#c9a04a', '#7d68a8', '#c97a94', '#6b8fa3', '#c2604f', '#4a5750'];
const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';

function fmtBytes(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

const PLAN_LABELS = { trial: 'トライアル' };

// 専用ドメイン取得までワイルドカードルートを意図的に外しているため、URLを
// 新規に設定するUIは表示しない（バックエンドのエンドポイント自体は残してある）。
// 万一すでにslugが設定された組織があれば、そのURLの案内だけは表示する
function OrgUrlCard({ org }) {
  if (!org.login_url) return null;
  return (
    <div style={{ border: '1px solid #e8e2d8', borderRadius: '10px', padding: '16px' }}>
      <div style={{ fontSize: '0.72rem', color: '#66766c', fontWeight: 700, marginBottom: '4px' }}>組織の専用ログインURL</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, wordBreak: 'break-all' }}>{org.login_url}</span>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '5px', flexShrink: 0 }}
          onClick={() => navigator.clipboard?.writeText(org.login_url)}
          title="コピー"
        >
          <Copy size={13} />
        </button>
      </div>
    </div>
  );
}

function CancelOrgCard({ auth }) {
  const [canceling, setCanceling] = useState(false);
  if (auth.user.role !== 'owner') return null;

  const handleCancel = async () => {
    const sure = window.confirm(
      '組織を解約しますか？\n\n'
      + '・解約すると、あなたを含む全メンバーがログインできなくなります\n'
      + '・チャット・電話メモなどのデータは削除されません\n'
      + '・再開したい場合は、サポート（support@easystance.app）までご連絡ください\n\n'
      + '本当に解約する場合は「OK」を押してください。'
    );
    if (!sure) return;
    setCanceling(true);
    try {
      const res = await fetch(`${API_BASE}/organization/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '解約処理に失敗しました');
        setCanceling(false);
        return;
      }
      localStorage.removeItem('callsync_auth');
      window.location.reload();
    } catch {
      alert('通信エラーが発生しました');
      setCanceling(false);
    }
  };

  return (
    <div style={{ border: '1px solid #e8dcd8', borderRadius: '10px', padding: '16px' }}>
      <div style={{ fontSize: '0.72rem', color: '#66766c', fontWeight: 700, marginBottom: '4px' }}>組織の解約</div>
      <div style={{ fontSize: '0.78rem', color: '#66766c', marginTop: '4px' }}>
        解約してもデータは削除されません。ログインができなくなるだけで、再開のご連絡はいつでも承ります。
      </div>
      <button
        type="button"
        className="btn-secondary"
        style={{ marginTop: '10px', fontSize: '0.8rem', color: '#c2604f', borderColor: '#e8dcd8' }}
        onClick={handleCancel}
        disabled={canceling}
      >
        {canceling ? '処理中…' : '組織を解約する'}
      </button>
    </div>
  );
}

function PlanTab({ auth }) {
  const [org, setOrg] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/organization`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(setOrg)
      .catch(() => setError('プラン情報の取得に失敗しました'));
  }, []);

  if (error) return <p style={{ color: '#c2604f' }}>{error}</p>;
  if (!org) return <p>読み込み中…</p>;

  const pct = Math.min(100, Math.round((org.storage_used_bytes / org.storage_limit_bytes) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ border: '1px solid #e8e2d8', borderRadius: '10px', padding: '16px' }}>
        <div style={{ fontSize: '0.72rem', color: '#66766c', fontWeight: 700, marginBottom: '4px' }}>現在のプラン</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{PLAN_LABELS[org.plan_tier] || org.plan_tier}</div>
        {org.trial_end_date && (
          <div style={{ fontSize: '0.82rem', color: '#5c8f74', fontWeight: 600, marginTop: '6px' }}>
            現在無料でご利用いただけます（{org.trial_end_date.replace(/-/g, '/')} 以降、正式なプランのご案内を予定しています）
          </div>
        )}
        {org.estimated_plan && (
          <div style={{ fontSize: '0.82rem', color: '#48564c', marginTop: '10px', background: '#f8f5ef', borderRadius: '8px', padding: '10px 12px' }}>
            現在のご利用人数（{org.user_count}名）だと、正式プランでは
            <strong style={{ color: '#1e2620' }}> {org.estimated_plan.label}</strong>
            {org.estimated_plan.priceYen != null ? (
              <> （<strong style={{ color: '#1e2620' }}>¥{org.estimated_plan.priceYen.toLocaleString()}/月</strong>、標準容量{org.estimated_plan.storageGb}GB）</>
            ) : ' （個別見積もり）'}
            が目安です。
          </div>
        )}
        <div style={{ fontSize: '0.78rem', color: '#66766c', marginTop: '8px' }}>
          料金プランの詳細は<a href="https://connectsuite.easystance.app/pricing" target="_blank" rel="noopener noreferrer" style={{ color: '#5c8f74', fontWeight: 600 }}>こちらの料金ページ</a>をご覧ください。お支払い方法のご登録が可能になり次第、あらためてご案内します。
        </div>
      </div>

      <OrgUrlCard org={org} />

      <div style={{ border: '1px solid #e8e2d8', borderRadius: '10px', padding: '16px' }}>
        <div style={{ fontSize: '0.72rem', color: '#66766c', fontWeight: 700, marginBottom: '4px' }}>ストレージ使用量（添付ファイル）</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, marginTop: '4px' }}>
          <span>{fmtBytes(org.storage_used_bytes)}</span>
          <span style={{ color: '#66766c', fontWeight: 400 }}>/ {fmtBytes(org.storage_limit_bytes)}</span>
        </div>
        <div style={{ width: '100%', height: '6px', background: '#f2ede1', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? '#c2604f' : '#6fa382', borderRadius: '3px' }} />
        </div>
      </div>

      <div style={{ fontSize: '0.78rem', color: '#66766c' }}>
        ユーザー数: {org.user_count}名
      </div>

      <CancelOrgCard auth={auth} />
    </div>
  );
}

function CallCategoryManager({ auth, department, categories, onChanged }) {
  const [label, setLabel] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` };
  const orgId = auth.user.organization_id;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`${API_BASE}/call-categories/${editingId}`, {
          method: 'PUT', headers: authHeaders,
          body: JSON.stringify({ label: label.trim(), organization_id: orgId })
        });
      } else {
        await fetch(`${API_BASE}/call-categories`, {
          method: 'POST', headers: authHeaders,
          body: JSON.stringify({ department_id: department.id, label: label.trim(), organization_id: orgId, sort_order: categories.length })
        });
      }
      setLabel('');
      setEditingId(null);
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`カテゴリ「${cat.label}」を削除してもよろしいですか？（過去の受電メモの記録は残ります）`)) return;
    await fetch(`${API_BASE}/call-categories/${cat.id}?organization_id=${orgId}`, {
      method: 'DELETE', headers: authHeaders
    });
    onChanged();
  };

  return (
    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #e8e2d8' }}>
      <div style={{ fontSize: '0.75rem', color: '#66766c', marginBottom: '8px' }}>
        受電カテゴリ（任意項目。受電メモ登録時にこの部門宛てだと選べるようになります）
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
        {categories.length === 0 && <span style={{ fontSize: '0.78rem', color: '#8a978c' }}>まだカテゴリがありません</span>}
        {categories.map(cat => (
          <span key={cat.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: '#f3f9f5', border: '1px solid #e3f0e8', borderRadius: '999px',
            padding: '3px 4px 3px 10px', fontSize: '0.78rem'
          }}>
            {cat.label}
            <button
              type="button"
              onClick={() => { setLabel(cat.label); setEditingId(cat.id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#5c8f74', display: 'flex' }}
            >
              <Edit size={11} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(cat)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#c2604f', display: 'flex' }}
            >
              <Trash2 size={11} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ fontSize: '0.72rem', color: '#8a978c', marginBottom: '4px' }}>
        1つずつ入力して「＋ 追加」してください（複数まとめて入力しないでください）
      </div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '6px' }}>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="例: 貸布団（個人）"
          className="form-input"
          style={{ flex: 1, fontSize: '0.82rem', padding: '6px 10px' }}
        />
        <button type="submit" className="btn-secondary" disabled={saving} style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
          {editingId ? '更新' : '＋ 追加'}
        </button>
        {editingId && (
          <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => { setEditingId(null); setLabel(''); }}>
            取消
          </button>
        )}
      </form>
    </div>
  );
}

export default function AdminModal({
  onClose, users, departments, currentUser, auth, onSaveUser, onDeleteUser, onSaveDept, onDeleteDept, onResetPin, onOpenCsvImport,
  callCategories = [], onCallCategoriesChanged
}) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'departments'
  const [expandedCategoryDeptId, setExpandedCategoryDeptId] = useState(null);
  const orgCode = String(auth.user.organization_id).padStart(3, '0');

  // User form
  const [userEdit, setUserEdit] = useState({ id: null, name: '', email: '', pin: '', department_id: '', role: 'user', avatar_color: '#7d68a8' });
  const [emailSuffix, setEmailSuffix] = useState('');
  const [isEditingUser, setIsEditingUser] = useState(false);

  // Dept form
  const [deptName, setDeptName] = useState('');
  const [editingDeptId, setEditingDeptId] = useState(null);

  const startEditUser = (u = null) => {
    if (u) {
      setUserEdit({
        id: u.id,
        name: u.name,
        email: u.email,
        pin: '',
        department_id: u.department_id || '',
        role: u.role || 'user',
        avatar_color: u.avatar_color || '#7d68a8'
      });
    } else {
      setUserEdit({ id: null, name: '', email: '', pin: '', department_id: departments[0]?.id || '', role: 'user', avatar_color: COLORS[Math.floor(Math.random() * COLORS.length)] });
      setEmailSuffix('');
    }
    setIsEditingUser(true);
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    const finalEmail = userEdit.id ? userEdit.email : `${orgCode}_${emailSuffix.trim().replace(/\s+/g, '')}`;
    if (!userEdit.name || (userEdit.id ? !finalEmail : !emailSuffix.trim())) return alert('名前とIDは必須です');
    if (!userEdit.id && userEdit.pin && !/^\d{4,8}$/.test(userEdit.pin)) return alert('PINは4〜8桁の数字で入力してください');
    onSaveUser({ ...userEdit, email: finalEmail });
    setIsEditingUser(false);
  };

  const handleResetPin = (u) => {
    const newPin = window.prompt(`「${u.name}」の新しいPIN（4〜8桁の数字）を入力してください`);
    if (newPin === null) return;
    if (!/^\d{4,8}$/.test(newPin)) return alert('PINは4〜8桁の数字で入力してください');
    onResetPin(u.id, newPin);
  };

  const handleSaveDept = (e) => {
    e.preventDefault();
    if (!deptName.trim()) return alert('部門名を入力してください');
    onSaveDept({ id: editingDeptId, name: deptName.trim() });
    setDeptName('');
    setEditingDeptId(null);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <Settings size={20} color="#7d68a8" />
            管理者メニュー（組織・アカウント管理）
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tab Headers */}
        <div className="admin-modal-tabs" style={{
          display: 'flex', borderBottom: '1px solid #e8e2d8', background: '#f8f5ef', padding: '0 12px',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch', gap: '4px'
        }}>
          <button
            className="admin-tab-btn"
            style={{
              padding: '10px 12px', border: 'none', background: 'transparent',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              color: activeTab === 'users' ? '#7d68a8' : '#48564c',
              borderBottom: activeTab === 'users' ? '2px solid #7d68a8' : '2px solid transparent'
            }}
            onClick={() => setActiveTab('users')}
          >
            👥 アカウント ({users.length})
          </button>
          <button
            className="admin-tab-btn"
            style={{
              padding: '10px 12px', border: 'none', background: 'transparent',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              color: activeTab === 'departments' ? '#7d68a8' : '#48564c',
              borderBottom: activeTab === 'departments' ? '2px solid #7d68a8' : '2px solid transparent'
            }}
            onClick={() => setActiveTab('departments')}
          >
            🏢 部門マスタ ({departments.length})
          </button>
          <button
            className="admin-tab-btn"
            style={{
              padding: '10px 12px', border: 'none', background: 'transparent',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              color: activeTab === 'plan' ? '#7d68a8' : '#48564c',
              borderBottom: activeTab === 'plan' ? '2px solid #7d68a8' : '2px solid transparent'
            }}
            onClick={() => setActiveTab('plan')}
          >
            💳 プラン・容量
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'users' && (
            <div>
              {isEditingUser ? (
                <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#38443c' }}>
                    {userEdit.id ? '社員アカウントの編集' : '新規アカウント追加'}
                  </div>
                  <div className="form-group">
                    <label className="form-label">氏名 <span style={{ color: '#d97a6c' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={userEdit.name} 
                      onChange={(e) => setUserEdit({ ...userEdit, name: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">所属部門</label>
                    <select
                      className="form-select"
                      value={userEdit.department_id}
                      onChange={(e) => setUserEdit({ ...userEdit, department_id: Number(e.target.value) })}
                    >
                      <option value="">未所属</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  {userEdit.id ? (
                    <div className="form-group">
                      <label className="form-label">ID（ログイン用） <span style={{ color: '#d97a6c' }}>*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        value={userEdit.email}
                        onChange={(e) => setUserEdit({ ...userEdit, email: e.target.value })}
                        required
                      />
                      <div style={{ fontSize: '0.72rem', color: '#66766c', marginTop: '3px' }}>
                        「Googleでログイン」も使わせたい場合は、本人の実際のGoogleアカウントのメールアドレスを入力してください
                      </div>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">ID（ログイン用） <span style={{ color: '#d97a6c' }}>*</span></label>
                      <div style={{ display: 'flex', alignItems: 'stretch' }}>
                        <span style={{
                          display: 'flex', alignItems: 'center', padding: '0 10px',
                          border: '1px solid #e8e2d8', borderRight: 'none', borderRadius: '8px 0 0 8px',
                          background: '#f8f5ef', color: '#48564c', fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap'
                        }}>
                          {orgCode}_
                        </span>
                        <input
                          type="text"
                          className="form-input"
                          style={{ borderRadius: '0 8px 8px 0' }}
                          value={emailSuffix}
                          onChange={(e) => setEmailSuffix(e.target.value)}
                          placeholder="例: yamada"
                          required
                        />
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#66766c', marginTop: '3px' }}>
                        先頭の「{orgCode}_」は自社の組織番号で自動的に付きます。実在するメールアドレスでなくてもOKです。「Googleでログイン」も使わせたい場合は、本人の実際のGoogleアカウントのメールアドレスを入力してください
                      </div>
                    </div>
                  )}

                  {!userEdit.id && (
                    <div className="form-group">
                      <label className="form-label">初期PIN（4〜8桁の数字。空欄の場合は「0000」になります）</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="form-input"
                        value={userEdit.pin}
                        onChange={(e) => setUserEdit({ ...userEdit, pin: e.target.value })}
                        placeholder="例: 1234"
                      />
                      <div style={{ fontSize: '0.72rem', color: '#66766c', marginTop: '3px' }}>
                        本人には初回ログイン時にPINの変更をお願いする仕様です
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">権限</label>
                      {userEdit.role === 'owner' ? (
                        <>
                          <div style={{
                            padding: '9px 12px', border: '1px solid #e8e2d8', borderRadius: '8px',
                            fontSize: '0.85rem', color: '#48564c', background: '#f8f5ef'
                          }}>
                            オーナー
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#c2604f', marginTop: '3px' }}>
                            オーナー権限はこの画面では変更できません。委譲は別途ご相談ください
                          </div>
                        </>
                      ) : (
                        <select
                          className="form-select"
                          value={userEdit.role}
                          onChange={(e) => setUserEdit({ ...userEdit, role: e.target.value })}
                        >
                          <option value="user">一般社員</option>
                          <option value="admin">管理者 (Admin)</option>
                        </select>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">アバターカラー</label>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '38px' }}>
                        {COLORS.map(c => (
                          <div 
                            key={c} 
                            style={{
                              width: '24px', height: '24px', borderRadius: '50%', background: c,
                              border: userEdit.avatar_color === c ? '2px solid #000' : 'none',
                              cursor: 'pointer'
                            }}
                            onClick={() => setUserEdit({ ...userEdit, avatar_color: c })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                    <button type="button" className="btn-secondary" onClick={() => setIsEditingUser(false)}>キャンセル</button>
                    <button type="submit" className="btn-primary">保存する</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="admin-user-action-bar" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#48564c' }}>所属部署や管理者権限を設定できます</span>
                    <div className="admin-user-action-btns" style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', whiteSpace: 'nowrap', padding: '8px 12px' }}
                        onClick={onOpenCsvImport}
                      >
                        <FileSpreadsheet size={14} /> CSVインポート
                      </button>
                      <button
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', whiteSpace: 'nowrap', padding: '8px 12px' }}
                        onClick={() => startEditUser()}
                      >
                        <Plus size={14} /> 新規アカウント登録
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {users.map(u => (
                      <div 
                        key={u.id}
                        style={{
                          border: '1px solid #e8e2d8', borderRadius: '8px', padding: '10px 14px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="user-avatar-badge" style={{ backgroundColor: u.avatar_color }}>
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e2620', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {u.name}
                              {u.role === 'owner' ? (
                                <span style={{ fontSize: '0.65rem', background: '#fbe8e4', color: '#c2604f', padding: '1px 5px', borderRadius: '4px' }}>オーナー</span>
                              ) : u.role === 'admin' ? (
                                <span style={{ fontSize: '0.65rem', background: '#efe9f8', color: '#7d68a8', padding: '1px 5px', borderRadius: '4px' }}>管理者</span>
                              ) : (
                                <span style={{ fontSize: '0.65rem', background: '#f2ede1', color: '#48564c', padding: '1px 5px', borderRadius: '4px' }}>一般</span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#48564c' }}>
                              {u.email} | 🏢 {u.department_name || '未所属'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-secondary" style={{ padding: '6px' }} title="PINをリセット" onClick={() => handleResetPin(u)}>
                            <KeyRound size={14} />
                          </button>
                          <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => startEditUser(u)}>
                            <Edit size={14} />
                          </button>
                          {users.length > 1 && u.role !== 'owner' && (
                            <button 
                              className="btn-secondary" 
                              style={{ padding: '6px', color: '#d97a6c' }}
                              onClick={() => {
                                if (window.confirm(`「${u.name}」を削除してもよろしいですか？`)) onDeleteUser(u.id);
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'departments' && (
            <div>
              <form onSubmit={handleSaveDept} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="例: 営業第二課 / 品質保証部 / 開発室" 
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  style={{ flex: 1 }}
                  required
                />
                <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  {editingDeptId ? '部門名を更新' : '部門を追加'}
                </button>
                {editingDeptId && (
                  <button type="button" className="btn-secondary" onClick={() => { setEditingDeptId(null); setDeptName(''); }}>
                    キャンセル
                  </button>
                )}
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {departments.map(d => (
                  <div
                    key={d.id}
                    style={{
                      border: '1px solid #e8e2d8', borderRadius: '8px', padding: '10px 14px',
                      background: '#ffffff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={16} color="#7d68a8" />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e2620' }}>{d.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#48564c', background: '#f8f5ef', padding: '2px 6px', borderRadius: '4px' }}>
                          所属: {d.user_count}名
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '6px', fontSize: '0.78rem' }}
                          onClick={() => setExpandedCategoryDeptId(expandedCategoryDeptId === d.id ? null : d.id)}
                        >
                          {expandedCategoryDeptId === d.id ? 'カテゴリを閉じる' : '📋 受電カテゴリ'}
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '6px' }}
                          onClick={() => {
                            setEditingDeptId(d.id);
                            setDeptName(d.name);
                          }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '6px', color: '#d97a6c' }}
                          onClick={() => {
                            if (window.confirm(`部門「${d.name}」を削除してもよろしいですか？`)) onDeleteDept(d.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {expandedCategoryDeptId === d.id && (
                      <CallCategoryManager
                        auth={auth}
                        department={d}
                        categories={callCategories.filter(c => c.department_id === d.id)}
                        onChanged={onCallCategoriesChanged}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'plan' && <PlanTab auth={auth} />}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
