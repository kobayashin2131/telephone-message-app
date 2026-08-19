import React from 'react';
import {
  MessageSquare, Phone, Plus, BookOpen, Settings, Users, Sparkles, Building2, Bell, BellOff, LogOut
} from 'lucide-react';

export default function AppHeader({
  activeApp,
  onChangeApp,
  currentUser,
  users,
  onLogout,
  onOpenNewCallMemo,
  onOpenContacts,
  onOpenAdmin,
  callMemosCount,
  unreadMessagesCount,
  notifyEnabled,
  onToggleNotify
}) {
  const unhandledCalls = callMemosCount?.unhandled || 0;

  return (
    <header className="suite-header">
      {/* 1. Suite Logo & App Switcher */}
      <div className="suite-left">
        <div className="suite-brand">
          <div className="suite-logo-icon">
            <Sparkles size={18} color="#fff" />
          </div>
          <div className="suite-brand-text">
            <span className="suite-title">Connect</span>
            <span className="suite-subtitle">Suite Pro</span>
          </div>
        </div>

        <div className="suite-nav-tabs">
          <button
            className={`suite-tab-btn ${activeApp === 'chat' ? 'active' : ''}`}
            onClick={() => onChangeApp('chat')}
          >
            <MessageSquare size={16} />
            <span>社内チャット</span>
            {unreadMessagesCount > 0 && (
              <span className="suite-badge-pill unread-pill">{unreadMessagesCount}</span>
            )}
          </button>

          <button
            className={`suite-tab-btn ${activeApp === 'callsync' ? 'active' : ''}`}
            onClick={() => onChangeApp('callsync')}
          >
            <Phone size={16} />
            <span>電話連絡（CallSync）</span>
            {unhandledCalls > 0 && (
              <span className="suite-badge-pill urgent-pill">{unhandledCalls}件 未対応</span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Global Actions & User Profile */}
      <div className="suite-right">
        <button className="btn-suite-quick-call" onClick={onOpenNewCallMemo} title="どこからでも受電内容を即時登録">
          <Phone size={15} />
          <span>＋ 受電メモ登録</span>
        </button>

        <button className="btn-suite-icon" onClick={onOpenContacts} title="受電先台帳・取引先名簿">
          <BookOpen size={16} />
          <span className="btn-label-desktop">台帳</span>
        </button>

        <button
          className={`btn-suite-icon ${notifyEnabled ? 'btn-notify-on' : ''}`}
          onClick={onToggleNotify}
          title={notifyEnabled ? '着信音・通知（タブを閉じても届きます）：ON（クリックでOFF）' : '着信音・通知（タブを閉じても届きます）：OFF（クリックでON）'}
        >
          {notifyEnabled ? <Bell size={16} /> : <BellOff size={16} />}
          <span className="btn-label-desktop">{notifyEnabled ? '通知ON' : '通知OFF'}</span>
        </button>

        {currentUser?.role === 'admin' && (
          <button className="btn-suite-icon btn-admin-accent" onClick={onOpenAdmin} title="組織・アカウントマスター管理">
            <Settings size={16} />
            <span className="btn-label-desktop">組織管理</span>
          </button>
        )}

        <div className="suite-user-badge">
          <div className="suite-user-avatar" style={{ backgroundColor: currentUser?.avatar_color || '#9b84c4' }}>
            {currentUser?.name?.charAt(0) || '👤'}
          </div>
          <div className="suite-user-info">
            <div className="suite-user-label">{currentUser?.role === 'admin' ? '管理者' : currentUser?.department_name || '一般'}</div>
            <div className="suite-user-name">{currentUser?.name}</div>
          </div>
          <button className="suite-user-logout-btn" onClick={onLogout} title="ログアウト">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
