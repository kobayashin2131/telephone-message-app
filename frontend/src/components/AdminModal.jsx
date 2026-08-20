import React, { useState, useEffect } from 'react';
import { X, Settings, Users, Building2, Plus, Edit, Trash2, ShieldCheck, UserCheck, KeyRound, FileSpreadsheet, CreditCard } from 'lucide-react';

const COLORS = ['#7d68a8', '#6fa382', '#c9a04a', '#7d68a8', '#c97a94', '#6b8fa3', '#c2604f', '#4a5750'];
const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';

function fmtBytes(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

const PLAN_LABELS = { trial: 'トライアル' };

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
        <div style={{ fontSize: '0.78rem', color: '#66766c', marginTop: '6px' }}>
          正式な料金プランは現在準備中です。プランのアップグレードが可能になり次第、こちらからご案内します。
        </div>
      </div>

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
    </div>
  );
}

export default function AdminModal({
  onClose, users, departments, currentUser, auth, onSaveUser, onDeleteUser, onSaveDept, onDeleteDept, onResetPin, onOpenCsvImport
}) {
  const isOwner = currentUser?.role === 'owner';
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'departments'

  // User form
  const [userEdit, setUserEdit] = useState({ id: null, name: '', email: '', pin: '', department_id: '', role: 'user', avatar_color: '#7d68a8' });
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
    }
    setIsEditingUser(true);
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!userEdit.name || !userEdit.email) return alert('名前とIDは必須です');
    if (!userEdit.id && userEdit.pin && !/^\d{4,8}$/.test(userEdit.pin)) return alert('PINは4〜8桁の数字で入力してください');
    onSaveUser(userEdit);
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
        <div style={{ display: 'flex', borderBottom: '1px solid #e8e2d8', background: '#f8f5ef', padding: '0 20px' }}>
          <button 
            style={{
              padding: '12px 16px', border: 'none', background: 'transparent',
              fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              color: activeTab === 'users' ? '#7d68a8' : '#48564c',
              borderBottom: activeTab === 'users' ? '2px solid #7d68a8' : '2px solid transparent'
            }}
            onClick={() => setActiveTab('users')}
          >
            👥 アカウント管理 ({users.length}名)
          </button>
          <button 
            style={{
              padding: '12px 16px', border: 'none', background: 'transparent',
              fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              color: activeTab === 'departments' ? '#7d68a8' : '#48564c',
              borderBottom: activeTab === 'departments' ? '2px solid #7d68a8' : '2px solid transparent'
            }}
            onClick={() => setActiveTab('departments')}
          >
            🏢 部門マスタ管理 ({departments.length}部門)
          </button>
          <button
            style={{
              padding: '12px 16px', border: 'none', background: 'transparent',
              fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">ID（メールアドレス） <span style={{ color: '#d97a6c' }}>*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        value={userEdit.email}
                        onChange={(e) => setUserEdit({ ...userEdit, email: e.target.value })}
                        placeholder="例: yamada@example.com"
                        required
                      />
                      <div style={{ fontSize: '0.72rem', color: '#66766c', marginTop: '3px' }}>
                        ID+PINでのみ使う場合は実在しなくてもOKです。「Googleでログイン」も使わせたい場合は、本人の実際のGoogleアカウントのメールアドレスを入力してください
                      </div>
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
                  </div>

                  {!userEdit.id && (
                    <div className="form-group">
                      <label className="form-label">初期PIN（4〜8桁の数字、未入力なら後で管理者がリセットできます）</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="form-input"
                        value={userEdit.pin}
                        onChange={(e) => setUserEdit({ ...userEdit, pin: e.target.value })}
                        placeholder="例: 1234"
                      />
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">権限</label>
                      <select 
                        className="form-select"
                        value={userEdit.role}
                        onChange={(e) => setUserEdit({ ...userEdit, role: e.target.value })}
                      >
                        <option value="user">一般社員</option>
                        <option value="admin">管理者 (Admin)</option>
                        {isOwner && <option value="owner">オーナー</option>}
                      </select>
                      {userEdit.role === 'owner' && (
                        <div style={{ fontSize: '0.72rem', color: '#c2604f', marginTop: '3px' }}>
                          オーナーは削除できず、組織に最低1人必要です
                        </div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#48564c' }}>所属部署や管理者権限を設定できます</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                        onClick={onOpenCsvImport}
                      >
                        <FileSpreadsheet size={14} /> CSVインポート
                      </button>
                      <button
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
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
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff'
                    }}
                  >
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
