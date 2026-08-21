import React, { useState } from 'react';
import { Phone, ChevronDown, ChevronUp, Check } from 'lucide-react';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr.replace(' ', 'T') + 'Z').getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

export default function CallMemoTray({ callMemos = [], currentUser, groups = [], onSelectChat, onUpdateStatus }) {
  const [expanded, setExpanded] = useState(false);

  const myGroupIds = new Set(
    groups.filter(g => currentUser && (g.member_ids?.includes(currentUser.id) || g.created_by === currentUser.id)).map(g => g.id)
  );

  const isMine = (m) => {
    if (m.target_type === 'dm') return m.target_id === currentUser?.id;
    if (m.target_type === 'group') return myGroupIds.has(m.target_id);
    if (m.target_type === 'department') return m.target_id === currentUser?.department_id;
    return false;
  };

  const myMemos = callMemos.filter(isMine).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const unhandled = myMemos.filter(m => m.status !== 'resolved');

  if (myMemos.length === 0) return null;

  return (
    <div className={`chat-sidebar-section call-memo-tray ${unhandled.length > 0 ? 'has-unhandled' : ''}`}>
      <button className="call-memo-tray-header" onClick={() => setExpanded(!expanded)}>
        <span className="call-memo-tray-title">
          <Phone size={14} /> 受電メモ
          {unhandled.length > 0 && <span className="suite-badge-pill urgent-pill">{unhandled.length}件 未対応</span>}
        </span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="call-memo-tray-list">
          {myMemos.map(m => (
            <div key={m.id} className={`call-memo-tray-item ${m.status}`}>
              <button
                className="call-memo-tray-item-main"
                onClick={() => onSelectChat(
                  m.target_type === 'dm'
                    ? { type: 'dm', id: m.created_by, name: m.creator_name, icon: '👤' }
                    : { type: m.target_type, id: m.target_id, name: m.target_name, icon: '💬' }
                )}
              >
                <span className={`status-pill ${m.status}`}>
                  {m.status === 'resolved' ? '✓ 完了' : m.status === 'in_progress' ? '⏳ 対応中' : '⚠️ 未対応'}
                </span>
                <div className="call-memo-tray-item-body">
                  <div className="call-memo-tray-item-title">{m.company_name} {m.contact_person && `様（${m.contact_person}）`}</div>
                  <div className="call-memo-tray-item-sub">
                    {m.target_type === 'dm' ? `${m.creator_name || '不明'}さんが記録` : m.target_name} ・ {timeAgo(m.created_at)}
                  </div>
                </div>
              </button>
              {m.status !== 'resolved' && (
                <button
                  className="call-memo-tray-item-resolve"
                  title="対応済みにする"
                  onClick={() => onUpdateStatus(m.id, 'resolved', '')}
                >
                  <Check size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
