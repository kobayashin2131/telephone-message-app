import React, { useState } from 'react';
import { 
  Phone, LayoutDashboard, Smartphone, BookOpen, Plus, Search, Filter, AlertTriangle, Clock, CheckCircle
} from 'lucide-react';
import DeskMonitorView from './DeskMonitorView';
import MobileViewMode from './MobileViewMode';
import CallMemoCard from './CallMemoCard';

export default function CallSyncApp({
  callMemos,
  users,
  departments,
  groups,
  contacts,
  currentUser,
  onSubmitCallMemo,
  onUpdateStatus,
  onOpenThread,
  onOpenNewCallMemo,
  onOpenContacts
}) {
  const [subView, setSubView] = useState('board'); // 'board', 'desk', 'mobile'
  const [filterScope, setFilterScope] = useState('all'); // 'all', 'me', 'unhandled', 'resolved'
  const [searchQuery, setSearchQuery] = useState('');

  // Stats calculation
  const totalCalls = callMemos.length;
  const unhandledCalls = callMemos.filter(m => m.status === 'unhandled').length;
  const inProgressCalls = callMemos.filter(m => m.status === 'in_progress').length;
  const resolvedCalls = callMemos.filter(m => m.status === 'resolved').length;

  const myCalls = callMemos.filter(m => {
    // If target is DM to current user, or created by current user
    if (m.target_type === 'dm' && Number(m.target_id) === Number(currentUser?.id)) return true;
    if (m.target_type === 'user' && Number(m.target_id) === Number(currentUser?.id)) return true;
    return false;
  });

  const filteredMemos = callMemos.filter(m => {
    // Scope filter
    if (filterScope === 'me') {
      const isForMe = (m.target_type === 'dm' || m.target_type === 'user') && Number(m.target_id) === Number(currentUser?.id);
      if (!isForMe) return false;
    } else if (filterScope === 'unhandled') {
      if (m.status !== 'unhandled') return false;
    } else if (filterScope === 'in_progress') {
      if (m.status !== 'in_progress') return false;
    } else if (filterScope === 'resolved') {
      if (m.status !== 'resolved') return false;
    }

    // Keyword search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = 
        (m.company_name && m.company_name.toLowerCase().includes(q)) ||
        (m.contact_person && m.contact_person.toLowerCase().includes(q)) ||
        (m.phone_number && m.phone_number.includes(q)) ||
        (m.body && m.body.toLowerCase().includes(q)) ||
        (m.subject && m.subject.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="callsync-app-container">
      {/* 1. CallSync Navigation & Stat Bar */}
      <div className="callsync-header-bar">
        <div className="callsync-subnav-tabs">
          <button 
            className={`subnav-tab ${subView === 'board' ? 'active' : ''}`}
            onClick={() => setSubView('board')}
          >
            <LayoutDashboard size={16} />
            <span>📋 電話メモ一覧・ボード</span>
          </button>
          <button 
            className={`subnav-tab ${subView === 'desk' ? 'active' : ''}`}
            onClick={() => setSubView('desk')}
          >
            <Clock size={16} />
            <span>🖥️ 事務員デスクモニター</span>
          </button>
          <button 
            className={`subnav-tab ${subView === 'mobile' ? 'active' : ''}`}
            onClick={() => setSubView('mobile')}
          >
            <Smartphone size={16} />
            <span>📱 現場モバイルビュー</span>
          </button>
          <button 
            className="subnav-tab"
            onClick={onOpenContacts}
          >
            <BookOpen size={16} />
            <span>📇 受電先台帳 ({contacts.length})</span>
          </button>
        </div>

        <div className="callsync-actions-right">
          <button className="btn-pop-call" onClick={onOpenNewCallMemo}>
            <Phone size={16} />
            <span>📞 受電メモを新規登録</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-views */}
      {subView === 'desk' && (
        <div className="callsync-body-view">
          <DeskMonitorView 
            users={users}
            departments={departments}
            groups={groups}
            contacts={contacts}
            callMemos={callMemos}
            currentUser={currentUser}
            onSubmitCallMemo={onSubmitCallMemo}
            onUpdateStatus={onUpdateStatus}
            onOpenThread={onOpenThread}
            onOpenNewCallMemo={onOpenNewCallMemo}
          />
        </div>
      )}

      {subView === 'mobile' && (
        <div className="callsync-body-view">
          <MobileViewMode 
            callMemos={callMemos}
            currentUser={currentUser}
            onUpdateStatus={onUpdateStatus}
            onOpenThread={onOpenThread}
          />
        </div>
      )}

      {subView === 'board' && (
        <div className="callsync-board-view">
          {/* Filter & Search Bar */}
          <div className="board-toolbar">
            <div className="board-stats-row">
              <button 
                className={`stat-filter-pill ${filterScope === 'all' ? 'active' : ''}`}
                onClick={() => setFilterScope('all')}
              >
                <span>全件</span>
                <strong>{totalCalls}</strong>
              </button>
              <button 
                className={`stat-filter-pill pill-unhandled ${filterScope === 'unhandled' ? 'active' : ''}`}
                onClick={() => setFilterScope('unhandled')}
              >
                <AlertTriangle size={13} />
                <span>未対応</span>
                <strong>{unhandledCalls}</strong>
              </button>
              <button 
                className={`stat-filter-pill pill-progress ${filterScope === 'in_progress' ? 'active' : ''}`}
                onClick={() => setFilterScope('in_progress')}
              >
                <Clock size={13} />
                <span>対応中</span>
                <strong>{inProgressCalls}</strong>
              </button>
              <button 
                className={`stat-filter-pill pill-resolved ${filterScope === 'resolved' ? 'active' : ''}`}
                onClick={() => setFilterScope('resolved')}
              >
                <CheckCircle size={13} />
                <span>完了</span>
                <strong>{resolvedCalls}</strong>
              </button>
              <button 
                className={`stat-filter-pill pill-me ${filterScope === 'me' ? 'active' : ''}`}
                onClick={() => setFilterScope('me')}
              >
                <span>👤 自分宛て</span>
                <strong>{myCalls.length}</strong>
              </button>
            </div>

            <div className="board-search-box">
              <Search size={15} className="search-icon" />
              <input 
                type="text" 
                placeholder="会社名・お名前・電話番号・メモ内容で検索..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="btn-clear-search" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>
          </div>

          {/* Cards Grid / Stream */}
          <div className="board-cards-stream">
            {filteredMemos.length === 0 ? (
              <div className="empty-memos-state">
                <Phone size={48} className="empty-icon" />
                <p>該当する受電メモはありません</p>
                <button className="btn-pop-call" onClick={onOpenNewCallMemo} style={{ marginTop: '12px' }}>
                  ＋ 受電メモを作成する
                </button>
              </div>
            ) : (
              <div className="cards-grid">
                {filteredMemos.map(memo => (
                  <CallMemoCard 
                    key={memo.id}
                    memo={memo}
                    currentUser={currentUser}
                    onUpdateStatus={onUpdateStatus}
                    onOpenThread={onOpenThread}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
