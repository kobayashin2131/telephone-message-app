import React from 'react';
import { 
  Phone, Plus, Users, MessageSquare, Building2, BookOpen, Settings, LayoutDashboard, Smartphone, ChevronRight
} from 'lucide-react';

export default function Sidebar({
  currentUser, users, departments, groups, activeChat, currentViewMode,
  onSelectChat, onSwitchUser, onChangeViewMode, onOpenNewGroup, onOpenNewCallMemo, onOpenContacts, onOpenAdmin
}) {
  return (
    <aside className="sidebar">
      {/* Brand & User Header */}
      <div className="sidebar-header">
        <div className="app-brand">
          <div className="app-brand-icon">
            <Phone size={20} color="#fff" />
          </div>
          <span>CallSync</span>
          <span className="app-badge-pop">Pro ✨</span>
        </div>

        {/* Current User Card */}
        <div className="user-selector-card">
          <div className="user-avatar" style={{ backgroundColor: currentUser?.avatar_color || '#3b82f6' }}>
            {currentUser?.name?.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--sidebar-muted)', fontWeight: 600 }}>現在の操作者:</div>
            <select 
              style={{
                background: 'transparent', color: '#fff', border: 'none',
                fontWeight: 700, fontSize: '0.88rem', width: '100%', cursor: 'pointer', outline: 'none'
              }}
              value={currentUser?.id || 1}
              onChange={(e) => onSwitchUser(Number(e.target.value))}
            >
              {users.map(u => (
                <option key={u.id} value={u.id} style={{ color: '#000' }}>
                  {u.name} ({u.role === 'admin' ? '管理者' : u.department_name || '一般'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Mode Tabs (Chat / Desk Monitor / Mobile View) */}
      <div className="sidebar-actions">
        <button className="btn-pop-call" onClick={onOpenNewCallMemo}>
          <Phone size={18} /> 📞 受電メモを新規登録
        </button>

        <div className="view-mode-tabs">
          <button 
            className={`tab-mode-btn ${currentViewMode === 'chat' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('chat')}
          >
            <MessageSquare size={14} /> 💬 チャット
          </button>
          <button 
            className={`tab-mode-btn ${currentViewMode === 'desk' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('desk')}
          >
            <LayoutDashboard size={14} /> 📞 事務員ビュー
          </button>
        </div>

        <div className="view-mode-tabs">
          <button 
            className={`tab-mode-btn ${currentViewMode === 'mobile' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('mobile')}
          >
            <Smartphone size={14} /> 📱 現場ビュー
          </button>
          <button className="tab-mode-btn" onClick={onOpenContacts}>
            <BookOpen size={14} /> 📇 受電先台帳
          </button>
        </div>

        {currentUser?.role === 'admin' && (
          <button 
            className="tab-mode-btn" 
            style={{ width: '100%', background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc' }}
            onClick={onOpenAdmin}
          >
            <Settings size={14} /> ⚙️ 管理者メニュー（組織・アカウント）
          </button>
        )}
      </div>

      {/* Nav List for Chat Mode */}
      <div className="sidebar-nav">
        {/* Groups */}
        <div className="nav-section">
          <div className="nav-section-title">
            <span>👥 グループ ({groups.length})</span>
            <button className="btn-icon-add" onClick={onOpenNewGroup} title="新規グループ作成">
              <Plus size={14} />
            </button>
          </div>
          {groups.map(g => {
            const isActive = currentViewMode === 'chat' && activeChat?.type === 'group' && activeChat.id === g.id;
            return (
              <div 
                key={g.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onChangeViewMode('chat');
                  onSelectChat({ type: 'group', id: g.id, name: g.name, icon: g.icon, memberCount: g.member_count, description: g.description });
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{g.icon || '👥'}</span>
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                <span className="nav-badge-pill">{g.member_count}名</span>
              </div>
            );
          })}
          <button 
            style={{
              width: '100%', padding: '6px 10px', marginTop: '6px',
              background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.18)',
              borderRadius: '8px', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.15s'
            }}
            onClick={onOpenNewGroup}
          >
            <Plus size={13} /> ＋ 新規グループ作成
          </button>
        </div>

        {/* 1on1 DMs */}
        <div className="nav-section">
          <div className="nav-section-title">
            <span>💬 1 on 1（個人DM）</span>
          </div>
          {users.filter(u => u.id !== currentUser?.id).map(u => {
            const isActive = currentViewMode === 'chat' && activeChat?.type === 'dm' && activeChat.id === u.id;
            return (
              <div 
                key={u.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onChangeViewMode('chat');
                  onSelectChat({ type: 'dm', id: u.id, name: u.name, avatar: u.avatar_color, department: u.department_name });
                }}
              >
                <div className="user-avatar" style={{ width: '26px', height: '26px', fontSize: '0.72rem', backgroundColor: u.avatar_color }}>
                  {u.name.charAt(0)}
                </div>
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</span>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              </div>
            );
          })}
        </div>

        {/* Official Departments */}
        <div className="nav-section">
          <div className="nav-section-title">
            <span>🏢 部門チャンネル</span>
          </div>
          {departments.map(d => {
            const isActive = currentViewMode === 'chat' && activeChat?.type === 'department' && activeChat.id === d.id;
            return (
              <div 
                key={d.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onChangeViewMode('chat');
                  onSelectChat({ type: 'department', id: d.id, name: d.name, icon: '🏢', memberCount: d.user_count });
                }}
              >
                <span>🏢</span>
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                <span className="nav-badge-pill">{d.user_count}名</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
