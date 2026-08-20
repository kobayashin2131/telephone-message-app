import React, { useState } from 'react';
import { Phone, CheckCircle, Clock, AlertTriangle, User, Building2, Search } from 'lucide-react';
import CallMemoCard from './CallMemoCard';
import { adaptCallMemo } from '../utils/memoAdapter';

export default function MobileViewMode({
  callMemos, currentUser, onUpdateStatus, onOpenThread
}) {
  const [tab, setTab] = useState('unresolved'); // 'unresolved' or 'resolved'

  const myMemos = callMemos.filter(m => {
    if (tab === 'unresolved' && m.status === 'resolved') return false;
    if (tab === 'resolved' && m.status !== 'resolved') return false;
    return true;
  });

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f8f5ef', maxWidth: '720px', margin: '0 auto', width: '100%' }}>
      {/* Mobile Top Header */}
      <div className="mobile-mode-header" style={{ background: '#ffffff', borderRadius: '16px', padding: '14px 16px', marginBottom: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1.0rem', color: '#1e2620', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            📱 現場・マイ受電一覧
          </div>
          <div style={{ fontSize: '0.75rem', color: '#48564c', marginTop: '2px' }}>
            ログイン: {currentUser?.name}
          </div>
        </div>
        <div className="mobile-mode-tabs" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button 
            className={`tab-mode-btn ${tab === 'unresolved' ? 'active' : ''}`}
            onClick={() => setTab('unresolved')}
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
          >
            ⚠️ 未対応
          </button>
          <button 
            className={`tab-mode-btn ${tab === 'resolved' ? 'active' : ''}`}
            onClick={() => setTab('resolved')}
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
          >
            ✓ 完了
          </button>
        </div>
      </div>

      {/* Cards Stream */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {myMemos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#5e6b60', background: '#ffffff', borderRadius: '18px' }}>
            受電メモはありません
          </div>
        ) : (
          myMemos.map(m => {
            const adaptedMsg = adaptCallMemo(m);
            return (
              <CallMemoCard 
                key={m.id}
                memo={adaptedMsg}
                onUpdateStatus={onUpdateStatus}
                onOpenThread={() => onOpenThread(adaptedMsg)}
                currentUserId={currentUser?.id}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
