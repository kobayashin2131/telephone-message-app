import React, { useState } from 'react';
import { 
  Users, MessageSquare, Plus, Search, ChevronRight, Hash, Sparkles
} from 'lucide-react';
import ChatArea from './ChatArea';
import ThreadDrawer from './ThreadDrawer';
import CallMemoTray from './CallMemoTray';

export default function ChatApp({
  currentUser,
  users,
  groups,
  callMemos = [],
  activeChat,
  onSelectChat,
  messages,
  organizationId,
  unreadByTarget = {},
  onSendMessage,
  onUpdateStatus,
  onOpenNewGroup,
  onOpenNewCallMemo,
  activeThread,
  onOpenThread,
  onCloseThread,
  onSendThreadReply
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter direct messages (exclude self)
  const dmUsers = users.filter(u => u.id !== currentUser?.id);

  // Filter groups: only show groups the current user belongs to (or created)
  const myGroups = groups.filter(g => {
    if (!currentUser) return true;
    if (g.member_ids && Array.isArray(g.member_ids)) {
      return g.member_ids.includes(currentUser.id) || g.created_by === currentUser.id;
    }
    return true;
  });

  const filteredGroups = myGroups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = dmUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.department_name && u.department_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={`chat-app-container ${activeChat ? 'has-active-chat' : ''}`}>
      {/* 1. Chat-specific Left Sidebar */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-title-row">
            <span className="chat-sidebar-title">💬 チャンネル & DM</span>
            <button className="btn-icon-circle-add" onClick={onOpenNewGroup} title="新規グループ・チャンネル作成">
              <Plus size={16} />
            </button>
          </div>
          <div className="chat-search-bar">
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              placeholder="チャンネルやメンバーを検索..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="chat-sidebar-scroll">
          <CallMemoTray
            callMemos={callMemos}
            currentUser={currentUser}
            groups={groups}
            onSelectChat={onSelectChat}
            onUpdateStatus={onUpdateStatus}
          />

          {/* Groups / Channels */}
          <div className="chat-sidebar-section">
            <div className="chat-section-label">
              <span>グループ・部署チャンネル ({filteredGroups.length})</span>
            </div>
            <div className="chat-list">
              {filteredGroups.map(g => {
                const isSelected = activeChat?.type === 'group' && activeChat?.id === g.id;
                const unread = unreadByTarget[`group-${g.id}`] || 0;
                return (
                  <button 
                    key={`group-${g.id}`}
                    className={`chat-list-item ${isSelected ? 'active' : ''}`}
                    onClick={() => onSelectChat({
                      type: 'group',
                      id: g.id,
                      name: g.name,
                      icon: g.icon,
                      memberCount: g.member_count,
                      description: g.description
                    })}
                  >
                    <span className="chat-item-icon">{g.icon || '💬'}</span>
                    <div className="chat-item-info">
                      <div className="chat-item-name">{g.name}</div>
                      <div className="chat-item-sub">{g.member_count}名参加 {g.description ? `• ${g.description}` : ''}</div>
                    </div>
                    {unread > 0 && (
                      <span className="suite-badge-pill unread-pill" style={{ marginLeft: 'auto', fontSize: '11px', padding: '2px 7px' }}>
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Messages */}
          <div className="chat-sidebar-section">
            <div className="chat-section-label">
              <span>ダイレクトメッセージ ({filteredUsers.length})</span>
            </div>
            <div className="chat-list">
              {filteredUsers.map(u => {
                const isSelected = activeChat?.type === 'dm' && activeChat?.id === u.id;
                const unread = unreadByTarget[`dm-${u.id}`] || 0;
                return (
                  <button 
                    key={`user-${u.id}`}
                    className={`chat-list-item ${isSelected ? 'active' : ''}`}
                    onClick={() => onSelectChat({
                      type: 'dm',
                      id: u.id,
                      name: u.name,
                      icon: '👤',
                      avatarColor: u.avatar_color,
                      department: u.department_name || (u.role === 'owner' ? 'オーナー' : u.role === 'admin' ? '管理者' : '未所属')
                    })}
                  >
                    <div className="chat-user-avatar" style={{ backgroundColor: u.avatar_color || '#9b84c4' }}>
                      {u.name.charAt(0)}
                    </div>
                    <div className="chat-item-info">
                      <div className="chat-item-name-row" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span className="chat-item-name">{u.name}</span>
                        {u.role === 'owner' && <span className="role-tag-badge owner">オーナー</span>}
                        {u.role === 'admin' && <span className="role-tag-badge admin">管理者</span>}
                      </div>
                      <div className="chat-item-sub">
                        {u.department_name || (u.role === 'owner' ? '👑 オーナー' : u.role === 'admin' ? '🛡️ 管理者' : '一般メンバー')}
                      </div>
                    </div>
                    {unread > 0 && (
                      <span className="suite-badge-pill unread-pill" style={{ marginLeft: 'auto', fontSize: '11px', padding: '2px 7px' }}>
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Chat Area */}
      <main className="chat-main-area">
        <ChatArea
          activeChat={activeChat}
          currentUser={currentUser}
          users={users}
          messages={messages}
          organizationId={organizationId}
          onSendMessage={onSendMessage}
          onUpdateStatus={onUpdateStatus}
          onOpenThread={onOpenThread}
          onOpenNewCallMemo={onOpenNewCallMemo}
          onBack={() => onSelectChat(null)}
        />
      </main>

      {/* 3. Thread Drawer (if active) */}
      {activeThread && (
        <ThreadDrawer 
          parentMessage={activeThread}
          currentUser={currentUser}
          onClose={onCloseThread}
          onSendReply={(content) => onSendThreadReply(activeThread.id, content)}
        />
      )}
    </div>
  );
}
