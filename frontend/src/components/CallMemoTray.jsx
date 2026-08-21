import React, { useState } from 'react';
import { Phone, ChevronDown, ChevronUp, Check, CheckCircle, AlertTriangle, Clock, ExternalLink } from 'lucide-react';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr.replace(' ', 'T') + 'Z').getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

function CallMemoTrayDetail({ memo, onUpdateStatus }) {
  const [noteText, setNoteText] = useState(memo.resolved_note || '');
  const isResolved = memo.status === 'resolved';
  const isInProgress = memo.status === 'in_progress';
  const isUrgent = memo.call_type === 'urgent';
  const isCallback = memo.call_type === 'callback';

  return (
    <div className="call-memo-tray-detail">
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
        {isUrgent ? (
          <span className="call-badge-tag tag-urgent"><AlertTriangle size={13} /> 緊急受電</span>
        ) : isCallback ? (
          <span className="call-badge-tag tag-callback"><Phone size={13} /> 折り返し要</span>
        ) : (
          <span className="call-badge-tag tag-info"><Clock size={13} /> 伝言のみ</span>
        )}
        {memo.target_type === 'group' && memo.target_name && (
          <span className="call-target-pill">💬 宛先: <strong>{memo.target_name}</strong></span>
        )}
      </div>

      {memo.creator_name && (
        <div style={{ fontSize: '0.75rem', color: '#66766c', marginBottom: '4px' }}>
          📞 {memo.target_type === 'dm' ? '記録してくれた人' : '受電者'}: <strong>{memo.creator_name}</strong>
        </div>
      )}

      {memo.phone_number && (
        <a href={`tel:${memo.phone_number}`} className="phone-pill-btn">
          <Phone size={14} color="#7aab8f" />
          <span>{memo.phone_number}</span>
          <span style={{ fontSize: '0.72rem', color: '#7aab8f', fontWeight: 500 }}>（タップで発信）</span>
        </a>
      )}

      {memo.category_label && (
        <span className="call-badge-tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-dark)', marginBottom: '4px' }}>
          📋 {memo.category_label}
        </span>
      )}
      {memo.subject && <div className="memo-subject-line">件名: {memo.subject}</div>}
      {memo.body && <div className="memo-body-box">{memo.body}</div>}

      {memo.resolved_note && (
        <div className="memo-note-display-card">
          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#3b6e4c', marginBottom: '4px' }}>📝 対応コメント・結果:</div>
          <div style={{ fontSize: '0.85rem', color: '#2d4d38', lineHeight: 1.4 }}>{memo.resolved_note}</div>
        </div>
      )}

      {!isResolved && (
        <div className="memo-inline-note-form" style={{ marginTop: '8px' }}>
          <textarea
            className="memo-note-textarea"
            placeholder="例: 14:30に折り返し発信。不在のため再度連絡予定"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows="2"
          />
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '6px' }}>
            {!isInProgress && (
              <button
                type="button"
                className="pop-btn-secondary"
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                onClick={() => onUpdateStatus(memo.id, 'in_progress', noteText.trim())}
              >
                ⏳ 対応中にする
              </button>
            )}
            <button
              type="button"
              className="btn-status-act resolve"
              style={{ fontSize: '0.72rem', padding: '3px 10px' }}
              onClick={() => onUpdateStatus(memo.id, 'resolved', noteText.trim())}
            >
              <CheckCircle size={12} /> 完了にする
            </button>
          </div>
        </div>
      )}
      {isResolved && (
        <button
          type="button"
          className="pop-btn-secondary"
          style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '8px', marginTop: '8px' }}
          onClick={() => onUpdateStatus(memo.id, 'pending')}
        >
          ↩ 未対応に戻す
        </button>
      )}
    </div>
  );
}

export default function CallMemoTray({ callMemos = [], currentUser, groups = [], onUpdateStatus, onOpenCallSyncApp }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedMemoId, setExpandedMemoId] = useState(null);

  const myGroupIds = new Set(
    groups.filter(g => currentUser && (g.member_ids?.includes(currentUser.id) || g.created_by === currentUser.id)).map(g => g.id)
  );

  const isMine = (m) => {
    if (m.target_type === 'dm') return m.target_id === currentUser?.id;
    if (m.target_type === 'group') return myGroupIds.has(m.target_id);
    if (m.target_type === 'department') return m.target_id === currentUser?.department_id;
    return false;
  };

  // 対応済みは「もう気にしなくていい」ものなので通知欄には出さない。ここは常に「今対応が要るもの」だけの一覧
  const unhandled = callMemos.filter(isMine).filter(m => m.status !== 'resolved').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (unhandled.length === 0) return null;

  return (
    <div className="chat-sidebar-section call-memo-tray has-unhandled">
      <button className="call-memo-tray-header" onClick={() => setExpanded(!expanded)}>
        <span className="call-memo-tray-title">
          <Phone size={14} /> 受電メモ
          <span className="suite-badge-pill urgent-pill">{unhandled.length}件 未対応</span>
        </span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="call-memo-tray-list">
          {unhandled.map(m => (
            <div key={m.id} className={`call-memo-tray-item ${m.status}`}>
              <button
                className="call-memo-tray-item-main"
                onClick={() => setExpandedMemoId(expandedMemoId === m.id ? null : m.id)}
              >
                <span className={`status-pill ${m.status}`}>
                  {m.status === 'resolved' ? '✓ 完了' : m.status === 'in_progress' ? '⏳ 対応中' : '⚠️ 未対応'}
                </span>
                <div className="call-memo-tray-item-body">
                  <div className="call-memo-tray-item-title">
                    {m.company_name
                      ? <>{m.company_name}{m.contact_person && ` 様（${m.contact_person}）`}</>
                      : (m.contact_person ? `${m.contact_person} 様` : '(お名前未登録)')}
                  </div>
                  <div className="call-memo-tray-item-sub">
                    {m.target_type === 'dm' ? `${m.creator_name || '不明'}さんが記録` : m.target_name} ・ {timeAgo(m.created_at)}
                  </div>
                </div>
              </button>
              <button
                className="call-memo-tray-item-resolve"
                title="対応済みにする"
                onClick={() => onUpdateStatus(m.id, 'resolved', '')}
              >
                <Check size={14} />
              </button>
              {expandedMemoId === m.id && <CallMemoTrayDetail memo={m} onUpdateStatus={onUpdateStatus} />}
            </div>
          ))}
          {onOpenCallSyncApp && (
            <button type="button" className="call-memo-tray-open-app" onClick={onOpenCallSyncApp}>
              <ExternalLink size={13} /> 電話メモアプリで全て見る
            </button>
          )}
        </div>
      )}
    </div>
  );
}
