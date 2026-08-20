import React, { useState } from 'react';
import { Phone, CheckCircle, Clock, AlertTriangle, MessageSquare, User, Building2, Edit3, Send, X, Calendar } from 'lucide-react';

function formatCallDateTime(dateStr) {
  if (!dateStr) return '';
  // Support both 'YYYY-MM-DD HH:MM:SS' and ISO string
  const cleanStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + (dateStr.endsWith('Z') ? '' : 'Z');
  const d = new Date(cleanStr);
  if (isNaN(d.getTime())) return dateStr;

  const now = new Date();
  const isToday = d.getFullYear() === now.getFullYear() &&
                  d.getMonth() === now.getMonth() &&
                  d.getDate() === now.getDate();

  const month = d.getMonth() + 1;
  const date = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  if (isToday) {
    return `本日 ${hours}:${minutes}`;
  }
  return `${month}/${date} ${hours}:${minutes}`;
}

export default function CallMemoCard({ memo, onUpdateStatus, onOpenThread, currentUserId }) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(memo?.memo_resolved_note || '');

  if (!memo) return null;

  const isResolved = memo.memo_status === 'resolved';
  const isInProgress = memo.memo_status === 'in_progress';
  const isUrgent = memo.memo_type === 'urgent';
  const isCallback = memo.memo_type === 'callback';

  const targetName = memo.memo_target_name || memo.target_name;
  const targetType = memo.memo_target_type || memo.target_type;
  const callTimeStr = formatCallDateTime(memo.memo_created_at || memo.created_at);

  const handleSaveNoteAndResolve = () => {
    onUpdateStatus(memo.memo_id, 'resolved', noteText.trim());
    setShowNoteInput(false);
  };

  const handleSaveNoteOnly = () => {
    onUpdateStatus(memo.memo_id, isInProgress ? 'in_progress' : 'pending', noteText.trim());
    setShowNoteInput(false);
  };

  return (
    <div className={`call-pop-card ${isUrgent ? 'urgent' : isCallback ? 'callback' : ''} ${isResolved ? 'resolved' : ''}`}>
      {/* Header */}
      <div className="call-pop-header">
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {isUrgent ? (
            <span className="call-badge-tag tag-urgent"><AlertTriangle size={13} /> 緊急受電</span>
          ) : isCallback ? (
            <span className="call-badge-tag tag-callback"><Phone size={13} /> 折り返し要</span>
          ) : (
            <span className="call-badge-tag tag-info"><Clock size={13} /> 伝言のみ</span>
          )}
          <span className={`status-pill ${memo.memo_status || 'pending'}`}>
            {isResolved ? '✓ 完了' : isInProgress ? '⏳ 対応中' : '⚠️ 未対応'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {callTimeStr && (
            <span className="call-time-badge" title={memo.memo_created_at || memo.created_at}>
              🕒 {callTimeStr}
            </span>
          )}
          {memo.memo_resolved_at && (
            <span style={{ fontSize: '0.72rem', color: '#6fa382', fontWeight: 700 }}>
              ✓ 完了: {memo.memo_resolver_name || '担当者'}
            </span>
          )}
        </div>
      </div>

      {/* Target & Receiver Row */}
      <div className="call-meta-bar" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px', fontSize: '0.75rem' }}>
        {targetName && (
          <span className="call-target-pill">
            {targetType === 'department' ? '🏢' : targetType === 'group' ? '💬' : '👤'} 宛先: <strong>{targetName}</strong>
          </span>
        )}
        {(memo.memo_creator_name || memo.creator_name || memo.sender_name) && (
          <span className="call-receiver-pill">
            📞 受電者: <strong>{memo.memo_creator_name || memo.creator_name || memo.sender_name}</strong>
          </span>
        )}
      </div>

      {/* Caller Info */}
      <div className="caller-title">
        🏢 {memo.memo_company} 
        <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#4a5750', marginLeft: '6px' }}>
          {memo.memo_contact}
        </span>
      </div>

      {memo.memo_phone && (
        <a href={`tel:${memo.memo_phone}`} className="phone-pill-btn">
          <Phone size={14} color="#7aab8f" />
          <span>{memo.memo_phone}</span>
          <span style={{ fontSize: '0.72rem', color: '#7aab8f', fontWeight: 500 }}>（タップで発信）</span>
        </a>
      )}

      {memo.memo_subject && (
        <div className="memo-subject-line">
          件名: {memo.memo_subject}
        </div>
      )}

      {memo.memo_body && (
        <div className="memo-body-box">
          {memo.memo_body}
        </div>
      )}

      {/* Resolution / Progress Note Display */}
      {memo.memo_resolved_note && !showNoteInput && (
        <div className="memo-note-display-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.75rem', color: '#3b6e4c' }}>📝 対応コメント・結果:</span>
            {!isResolved && (
              <button 
                type="button" 
                className="btn-edit-note"
                onClick={() => {
                  setNoteText(memo.memo_resolved_note || '');
                  setShowNoteInput(true);
                }}
              >
                <Edit3 size={12} /> 編集
              </button>
            )}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#2d4d38', lineHeight: 1.4 }}>
            {memo.memo_resolved_note}
          </div>
        </div>
      )}

      {/* Inline Note Input Form */}
      {showNoteInput && (
        <div className="memo-inline-note-form">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563' }}>対応内容・メモを入力:</span>
            <button type="button" className="btn-close-note" onClick={() => setShowNoteInput(false)}><X size={13} /></button>
          </div>
          <textarea
            className="memo-note-textarea"
            placeholder="例: 14:30に折り返し発信。不在のため再度連絡予定 / 見積書をメール送付済み"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows="2"
            autoFocus
          />
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button 
              type="button" 
              className="pop-btn-secondary" 
              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              onClick={() => setShowNoteInput(false)}
            >
              キャンセル
            </button>
            {!isResolved && (
              <button 
                type="button" 
                className="pop-btn-secondary"
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                onClick={handleSaveNoteOnly}
              >
                メモのみ保存
              </button>
            )}
            <button 
              type="button" 
              className="btn-status-act resolve" 
              style={{ fontSize: '0.72rem', padding: '3px 10px' }}
              onClick={handleSaveNoteAndResolve}
            >
              <CheckCircle size={12} /> 完了にする
            </button>
          </div>
        </div>
      )}

      {/* Card Actions Footer */}
      <div className="call-card-footer">
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isResolved && (
            <>
              {!isInProgress ? (
                <button 
                  className="btn-status-act progress"
                  onClick={() => {
                    onUpdateStatus(memo.memo_id, 'in_progress');
                    setNoteText(memo.memo_resolved_note || '');
                    setShowNoteInput(true);
                  }}
                  title="ステータスを対応中に変更してメモを入力"
                >
                  ⏳ 対応中にしてメモ
                </button>
              ) : (
                !showNoteInput && (
                  <button 
                    className="pop-btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    onClick={() => {
                      setNoteText(memo.memo_resolved_note || '');
                      setShowNoteInput(true);
                    }}
                  >
                    📝 対応メモを追加
                  </button>
                )
              )}
              {!showNoteInput && (
                <button 
                  className="btn-status-act resolve"
                  onClick={() => {
                    setNoteText(memo.memo_resolved_note || '');
                    setShowNoteInput(true);
                  }}
                >
                  <CheckCircle size={14} /> 完了にする / メモ
                </button>
              )}
            </>
          )}
          {isResolved && (
            <button 
              className="pop-btn-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '8px' }}
              onClick={() => onUpdateStatus(memo.memo_id, 'pending')}
            >
              ↩ 未対応に戻す
            </button>
          )}
        </div>

        <button 
          className="btn-thread-pop"
          onClick={() => onOpenThread(memo)}
        >
          <MessageSquare size={13} />
          {memo.thread_count > 0 ? `スレッド (${memo.thread_count})` : 'スレッド'}
        </button>
      </div>
    </div>
  );
}
