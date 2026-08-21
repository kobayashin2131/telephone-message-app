import React, { useState } from 'react';
import {
  Phone, LayoutDashboard, Smartphone, BookOpen, Plus, Search, Filter, AlertTriangle, Clock, CheckCircle, BarChart3
} from 'lucide-react';
import DeskMonitorView from './DeskMonitorView';
import MobileViewMode from './MobileViewMode';
import CallMemoCard from './CallMemoCard';
import CallAnalyticsView from './CallAnalyticsView';
import { adaptCallMemo } from '../utils/memoAdapter';

export default function CallSyncApp({
  callMemos,
  users,
  departments,
  groups,
  contacts,
  currentUser,
  auth,
  onSubmitCallMemo,
  onUpdateStatus,
  onOpenThread,
  onOpenNewCallMemo,
  onOpenContacts
}) {
  const isStaff = currentUser?.role === 'owner' || currentUser?.role === 'admin';
  const [subView, setSubView] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('callsync_default_subview');
      if (saved) return saved;
      // If mobile screen (width < 768px), default to 'mobile' (現場ビュー), otherwise 'desk' (事務員デスクモニター)
      return window.innerWidth < 768 ? 'mobile' : 'desk';
    }
    return 'desk';
  });

  const handleSwitchSubView = (view) => {
    setSubView(view);
    try {
      localStorage.setItem('callsync_default_subview', view);
    } catch (e) {}
  };

  const [filterScope, setFilterScope] = useState('all'); // 'all', 'me', 'unhandled', 'resolved'
  const [searchQuery, setSearchQuery] = useState('');

  // Stats calculation
  const totalCalls = callMemos.length;
  const unhandledCalls = callMemos.filter(m => m.status === 'pending').length;
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
      if (m.status !== 'pending') return false;
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
            className={`subnav-tab ${subView === 'mobile' ? 'active' : ''}`}
            onClick={() => handleSwitchSubView('mobile')}
          >
            <Smartphone size={15} />
            <span className="subnav-label-long">現場モバイルビュー</span>
            <span className="subnav-label-short">現場</span>
          </button>
          <button
            className={`subnav-tab ${subView === 'desk' ? 'active' : ''}`}
            onClick={() => handleSwitchSubView('desk')}
          >
            <Clock size={15} />
            <span className="subnav-label-long">事務員デスクモニター</span>
            <span className="subnav-label-short">デスク</span>
          </button>
          <button 
            className={`subnav-tab ${subView === 'board' ? 'active' : ''}`}
            onClick={() => handleSwitchSubView('board')}
          >
            <LayoutDashboard size={15} />
            <span className="subnav-label-long">電話メモ一覧・ボード</span>
            <span className="subnav-label-short">ボード</span>
          </button>
          <button
            className="subnav-tab"
            onClick={onOpenContacts}
          >
            <BookOpen size={15} />
            <span className="subnav-label-long">受電先台帳（{contacts.length}）</span>
            <span className="subnav-label-short">台帳({contacts.length})</span>
          </button>
          {isStaff && (
            <button
              className={`subnav-tab ${subView === 'analytics' ? 'active' : ''}`}
              onClick={() => handleSwitchSubView('analytics')}
            >
              <BarChart3 size={15} />
              <span className="subnav-label-long">受電分析</span>
              <span className="subnav-label-short">分析</span>
            </button>
          )}
        </div>

        <div className="callsync-actions-right">
          <button className="btn-pop-call" onClick={onOpenNewCallMemo}>
            <Phone size={15} />
            <span>受電メモ登録</span>
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

      {subView === 'analytics' && isStaff && (
        <div className="callsync-body-view">
          <CallAnalyticsView auth={auth} />
        </div>
      )}

      {(subView === 'board' || (subView === 'analytics' && !isStaff)) && (
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
                {filteredMemos.map(memo => {
                  const adapted = adaptCallMemo(memo);
                  return (
                    <CallMemoCard
                      key={memo.id}
                      memo={adapted}
                      currentUserId={currentUser?.id}
                      onUpdateStatus={onUpdateStatus}
                      onOpenThread={() => onOpenThread(adapted)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
