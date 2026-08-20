import React, { useState } from 'react';
import { X, Users, Check, Building2, ChevronDown, Smile } from 'lucide-react';

const ICON_CATEGORIES = [
  {
    label: '💼 ビジネス・プロジェクト',
    icons: ['💬', '🚀', '💼', '📊', '🏢', '🤝', '🎯', '💡', '📌', '🏆']
  },
  {
    label: '⚡ 現場・運用・緊急',
    icons: ['⚡', '🚨', '🛠️', '📦', '🚚', '📞', '🛡️', '⚙️', '📋', '🔑']
  },
  {
    label: '✨ チーム・コミュニケーション',
    icons: ['👥', '🌟', '☕', '💎', '🌿', '🎨', '🔥', '🎉', '🍀', '✨']
  }
];

const QUICK_TEMPLATES = [
  { icon: '📞', name: '受電・電話連絡共有', desc: '社外からの受電連絡を一括共有・対応するグループ' },
  { icon: '🚨', name: '緊急対応・至急連絡', desc: '至急案件やトラブル対応の連絡用' },
  { icon: '💼', name: '営業案件・商談PJ', desc: '商談進捗や見積・提案の共有用' },
  { icon: '🏢', name: '役員会・幹部連絡', desc: '経営陣・マネージャー陣の意思決定用' }
];

export default function NewGroupModal({ onClose, users, departments, currentUserId, onCreateGroup }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('💬');
  const [showIconPalette, setShowIconPalette] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([currentUserId]);

  const applyTemplate = (tpl) => {
    setIcon(tpl.icon);
    setName(tpl.name);
    setDescription(tpl.desc);
  };

  // Toggle individual user
  const toggleUser = (uid) => {
    if (selectedUserIds.includes(uid)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== uid));
    } else {
      setSelectedUserIds([...selectedUserIds, uid]);
    }
  };

  // Toggle entire department
  const toggleDepartment = (deptId) => {
    const deptUserIds = users.filter(u => u.department_id === deptId).map(u => u.id);
    const allSelected = deptUserIds.every(id => selectedUserIds.includes(id));
    if (allSelected) {
      // Remove all dept users
      setSelectedUserIds(selectedUserIds.filter(id => !deptUserIds.includes(id)));
    } else {
      // Add all dept users
      const newSet = new Set([...selectedUserIds, ...deptUserIds]);
      setSelectedUserIds(Array.from(newSet));
    }
  };

  const isDeptFullySelected = (deptId) => {
    const deptUsers = users.filter(u => u.department_id === deptId);
    if (deptUsers.length === 0) return false;
    return deptUsers.every(u => selectedUserIds.includes(u.id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('グループ名を入力してください');
    onCreateGroup({
      name: name.trim(),
      description: description.trim(),
      icon,
      member_ids: selectedUserIds,
      created_by: currentUserId
    });
    onClose();
  };

  const selectedUsersList = users.filter(u => selectedUserIds.includes(u.id));

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title">
            <Users size={20} color="#7d68a8" />
            新規グループ作成
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            {/* Quick Templates */}
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>
                💡 クイックテンプレート（ワンタップで入力）
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {QUICK_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.name}
                    type="button"
                    className="dept-chip"
                    style={{ fontSize: '0.73rem', padding: '3px 8px' }}
                    onClick={() => applyTemplate(tpl)}
                  >
                    <span>{tpl.icon}</span>
                    <span>{tpl.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Group Name & Icon */}
            <div className="form-group">
              <label className="form-label">アイコン ＆ グループ名 <span style={{ color: '#d97a6c' }}>*</span></label>
              <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                <button
                  type="button"
                  className="icon-picker-btn"
                  onClick={() => setShowIconPalette(!showIconPalette)}
                  title="アイコンを変更"
                >
                  <span className="icon-picker-emoji">{icon}</span>
                  <ChevronDown size={14} color="#64748b" />
                </button>

                {showIconPalette && (
                  <div className="icon-palette-popover">
                    <div className="icon-palette-header">
                      <span>アイコンを選択</span>
                      <button type="button" onClick={() => setShowIconPalette(false)}><X size={13} /></button>
                    </div>
                    <div className="icon-palette-scroll">
                      {ICON_CATEGORIES.map(cat => (
                        <div key={cat.label} className="icon-category-block">
                          <div className="icon-category-label">{cat.label}</div>
                          <div className="icon-grid">
                            {cat.icons.map(emoji => (
                              <button
                                key={emoji}
                                type="button"
                                className={`icon-grid-btn ${icon === emoji ? 'active' : ''}`}
                                onClick={() => {
                                  setIcon(emoji);
                                  setShowIconPalette(false);
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="例: 秋の展示会PJ / 現場緊急対応 / 役員会" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ flex: 1 }}
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">グループの説明（任意）</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="このグループの目的や対象案件など" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Department Quick Multi-Select */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🏢 部門ごと一括選択</span>
                <span style={{ fontSize: '0.75rem', color: '#48564c', fontWeight: 400 }}>クリックで部門全員をON/OFF</span>
              </label>
              <div className="dept-chips-grid">
                {departments.map(dept => {
                  const active = isDeptFullySelected(dept.id);
                  return (
                    <div 
                      key={dept.id}
                      className={`dept-chip ${active ? 'active' : ''}`}
                      onClick={() => toggleDepartment(dept.id)}
                    >
                      <Building2 size={14} />
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dept.name}</span>
                      {active && <Check size={14} color="#7d68a8" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual Member Select List */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>👤 個別メンバー選択</span>
                <span style={{ fontSize: '0.75rem', color: '#7d68a8', fontWeight: 600 }}>
                  選択中: {selectedUserIds.length}名
                </span>
              </label>
              <div className="members-check-list">
                {users.map(u => {
                  const isSelected = selectedUserIds.includes(u.id);
                  const isOwner = u.role === 'owner';
                  const isAdmin = u.role === 'admin';
                  return (
                    <div 
                      key={u.id}
                      className="member-check-row"
                      onClick={() => toggleUser(u.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div 
                          className="user-avatar-badge" 
                          style={{ width: '26px', height: '26px', fontSize: '0.75rem', backgroundColor: u.avatar_color }}
                        >
                          {u.name.charAt(0)}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38443c' }}>{u.name}</span>
                        {isOwner && (
                          <span className="role-tag-badge owner">オーナー</span>
                        )}
                        {isAdmin && !isOwner && (
                          <span className="role-tag-badge admin">管理者</span>
                        )}
                        <span style={{ fontSize: '0.7rem', color: '#48564c', background: '#f2ede1', padding: '1px 6px', borderRadius: '4px' }}>
                          {u.department_name || '未所属'}
                        </span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => {}}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Preview summary */}
            <div style={{ fontSize: '0.8rem', color: '#4a5750', background: '#f8f5ef', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e8e2d8' }}>
              <strong>👥 参加予定:</strong> {selectedUsersList.map(u => u.name.split('（')[0]).join(', ') || 'なし'}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>キャンセル</button>
            <button type="submit" className="btn-primary">グループを作成</button>
          </div>
        </form>
      </div>
    </div>
  );
}
