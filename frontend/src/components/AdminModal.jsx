import React, { useState } from 'react';
import { X, Settings, Users, Building2, Plus, Edit, Trash2, ShieldCheck, UserCheck } from 'lucide-react';

const COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0284c7', '#dc2626', '#475569'];

export default function AdminModal({
  onClose, users, departments, onSaveUser, onDeleteUser, onSaveDept, onDeleteDept
}) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'departments'

  // User form
  const [userEdit, setUserEdit] = useState({ id: null, name: '', email: '', password: '', department_id: '', role: 'user', avatar_color: '#2563eb' });
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
        password: '',
        department_id: u.department_id || '',
        role: u.role || 'user',
        avatar_color: u.avatar_color || '#2563eb'
      });
    } else {
      setUserEdit({ id: null, name: '', email: '', password: 'password123', department_id: departments[0]?.id || '', role: 'user', avatar_color: COLORS[Math.floor(Math.random() * COLORS.length)] });
    }
    setIsEditingUser(true);
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!userEdit.name || !userEdit.email) return alert('名前とメールアドレスは必須です');
    onSaveUser(userEdit);
    setIsEditingUser(false);
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
            <Settings size={20} color="#2563eb" />
            管理者メニュー（組織・アカウント管理）
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tab Headers */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 20px' }}>
          <button 
            style={{
              padding: '12px 16px', border: 'none', background: 'transparent',
              fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              color: activeTab === 'users' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'users' ? '2px solid #2563eb' : '2px solid transparent'
            }}
            onClick={() => setActiveTab('users')}
          >
            👥 アカウント管理 ({users.length}名)
          </button>
          <button 
            style={{
              padding: '12px 16px', border: 'none', background: 'transparent',
              fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              color: activeTab === 'departments' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'departments' ? '2px solid #2563eb' : '2px solid transparent'
            }}
            onClick={() => setActiveTab('departments')}
          >
            🏢 部門マスタ管理 ({departments.length}部門)
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'users' && (
            <div>
              {isEditingUser ? (
                <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                    {userEdit.id ? '社員アカウントの編集' : '新規アカウント追加'}
                  </div>
                  <div className="form-group">
                    <label className="form-label">氏名 <span style={{ color: '#ef4444' }}>*</span></label>
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
                      <label className="form-label">メールアドレス <span style={{ color: '#ef4444' }}>*</span></label>
                      <input 
                        type="email" 
                        className="form-input" 
                        value={userEdit.email} 
                        onChange={(e) => setUserEdit({ ...userEdit, email: e.target.value })} 
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
                  </div>
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
                      </select>
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
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>所属部署や管理者権限を設定できます</span>
                    <button 
                      className="btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                      onClick={() => startEditUser()}
                    >
                      <Plus size={14} /> 新規アカウント登録
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {users.map(u => (
                      <div 
                        key={u.id}
                        style={{
                          border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="user-avatar-badge" style={{ backgroundColor: u.avatar_color }}>
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {u.name}
                              {u.role === 'admin' ? (
                                <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1d4ed8', padding: '1px 5px', borderRadius: '4px' }}>管理者</span>
                              ) : (
                                <span style={{ fontSize: '0.65rem', background: '#f1f5f9', color: '#64748b', padding: '1px 5px', borderRadius: '4px' }}>一般</span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {u.email} | 🏢 {u.department_name || '未所属'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => startEditUser(u)}>
                            <Edit size={14} />
                          </button>
                          {users.length > 1 && (
                            <button 
                              className="btn-secondary" 
                              style={{ padding: '6px', color: '#ef4444' }}
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
                      border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={16} color="#2563eb" />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{d.name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px' }}>
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
                        style={{ padding: '6px', color: '#ef4444' }}
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
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
