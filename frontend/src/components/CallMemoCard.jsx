import React from 'react';
import { Phone, CheckCircle, Clock, AlertTriangle, MessageSquare, User, Sparkles } from 'lucide-react';

export default function CallMemoCard({ memo, onUpdateStatus, onOpenThread, currentUserId }) {
  if (!memo) return null;

  const isResolved = memo.memo_status === 'resolved';
  const isInProgress = memo.memo_status === 'in_progress';
  const isUrgent = memo.memo_type === 'urgent';
  const isCallback = memo.memo_type === 'callback';

  return (
    <div className={`call-pop-card ${isUrgent ? 'urgent' : isCallback ? 'callback' : ''} ${isResolved ? 'resolved' : ''}`}>
      <div className="call-pop-header">
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
        {memo.memo_resolved_at && (
          <span style={{ fontSize: '0.75rem', color: '#6fa382', fontWeight: 700 }}>
            完了: {memo.memo_resolver_name || '担当者'}
          </span>
        )}
      </div>

      <div className="caller-title">
        🏢 {memo.memo_company} 
        <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#4a5750' }}>
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

      {memo.memo_resolved_note && (
        <div style={{ fontSize: '0.8rem', background: '#e6f2ea', border: '1px solid #c3ddc9', padding: '8px 12px', borderRadius: '8px', color: '#4f7a60', marginBottom: '10px' }}>
          <strong>📝 対応結果メモ:</strong> {memo.memo_resolved_note}
        </div>
      )}

      <div className="call-card-footer">
        <div style={{ display: 'flex', gap: '8px' }}>
          {!isResolved && (
            <>
              {!isInProgress && (
                <button 
                  className="btn-status-act progress"
                  onClick={() => onUpdateStatus(memo.memo_id, 'in_progress')}
                >
                  ⏳ 対応中にする
                </button>
              )}
              <button 
                className="btn-status-act resolve"
                onClick={() => {
                  const note = window.prompt('対応メモ（折り返し結果など）を入力してください（空欄でもOK）:');
                  if (note !== null) onUpdateStatus(memo.memo_id, 'resolved', note);
                }}
              >
                <CheckCircle size={14} /> 完了にする
              </button>
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
