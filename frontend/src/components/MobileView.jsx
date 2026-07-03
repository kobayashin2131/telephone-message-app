import React, { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Link } from 'react-router-dom';

function MobileView({ departments, users, messages, onDataChanged }) {
  const [currentUser, setCurrentUser] = useState(users.length > 0 ? users[0].id : '');
  const [resolvingId, setResolvingId] = useState(null);
  const [memo, setMemo] = useState('');
  const [tab, setTab] = useState('unresolved'); // 'unresolved' or 'resolved'

  const activeUser = users.find(u => u.id === parseInt(currentUser));

  const filteredMessages = useMemo(() => {
    if (!activeUser) return messages;
    return messages.filter(msg => {
      // 宛先の中に自分、または自分の部署が含まれているか、または緊急か
      const isTarget = msg.targets.some(t => {
        if (t.type === 'user' && t.user_id === activeUser.id) return true;
        if (t.type === 'department' && t.department_id === activeUser.department_id) return true;
        return false;
      });
      return isTarget || msg.is_urgent;
    });
  }, [messages, activeUser]);

  const unresolvedMessages = filteredMessages.filter(m => !m.is_resolved);
  const resolvedMessages = filteredMessages.filter(m => m.is_resolved);
  const displayMessages = tab === 'unresolved' ? unresolvedMessages : resolvedMessages;

  const handleResolve = async (msgId) => {
    if (!activeUser) return;
    try {
      const res = await fetch(`/api/messages/${msgId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolved_by: activeUser.name,
          resolved_memo: memo
        })
      });
      if (res.ok) {
        setResolvingId(null);
        setMemo('');
        onDataChanged();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeUser) {
    return (
      <div className="card glass">
        <h2 className="card-title">ユーザー選択</h2>
        <select className="form-control" value={currentUser} onChange={e => setCurrentUser(e.target.value)}>
          <option value="">選択してください...</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
    );
  }

  return (
    <div>
      <div className="mobile-filters" style={{justifyContent: 'space-between', alignItems: 'center'}}>
        <div className="form-group" style={{marginBottom: 0, flex: 1, marginRight: '1rem'}}>
          <select className="form-control" value={currentUser} onChange={e => setCurrentUser(e.target.value)}>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} (担当)</option>)}
          </select>
        </div>
        <Link to="/history" className="btn" style={{backgroundColor: 'var(--surface-color)', padding: '0.5rem 1rem', width: 'auto'}}>
          🔍 履歴
        </Link>
      </div>

      <div className="view-toggle" style={{marginBottom: '1rem', width: '100%', display: 'flex'}}>
        <button style={{flex: 1}} className={tab === 'unresolved' ? 'active' : ''} onClick={() => setTab('unresolved')}>
          未対応 ({unresolvedMessages.length})
        </button>
        <button style={{flex: 1}} className={tab === 'resolved' ? 'active' : ''} onClick={() => setTab('resolved')}>
          対応済 ({resolvedMessages.length})
        </button>
      </div>

      <div className="message-list">
        {displayMessages.length === 0 && (
          <div className="card glass" style={{textAlign: 'center', padding: '3rem 1rem'}}>
            <p>🎉 現在表示する連絡はありません。</p>
          </div>
        )}
        
        {displayMessages.map(msg => (
          <div key={msg.id} className={`message-item glass card ${msg.is_resolved ? 'resolved' : ''} ${msg.is_urgent ? 'urgent' : ''}`} style={{padding: '1.25rem'}}>
            <div className="message-header">
              <div className="caller-info">{msg.caller_name} 様より</div>
              <div className="message-meta">
                {msg.is_urgent && <span className="badge badge-urgent">至急</span>}
              </div>
            </div>
            
            {msg.caller_number && (
              <a href={`tel:${msg.caller_number}`} style={{color: 'var(--primary-color)', textDecoration: 'none', display: 'inline-block', margin: '0.5rem 0'}}>
                📞 {msg.caller_number} (タップして発信)
              </a>
            )}

            <div className="message-body" style={{marginTop: '0.5rem'}}>
              {msg.message}
            </div>

            <div style={{marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
              受付: {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ja })} (受電: {msg.receiver_name})
              <br/>
              宛先: {msg.targets.map(t => t.name).join(', ')}
            </div>

            {!msg.is_resolved && (
              <div className="message-actions">
                {resolvingId === msg.id ? (
                  <div className="resolve-form" style={{width: '100%'}}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="対応メモ（任意）" 
                      value={memo} 
                      onChange={e => setMemo(e.target.value)} 
                    />
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <button className="btn btn-success" onClick={() => handleResolve(msg.id)} style={{flex: 1}}>
                        完了する
                      </button>
                      <button className="btn" style={{backgroundColor: 'var(--surface-color-light)', color: 'white'}} onClick={() => setResolvingId(null)}>
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-success" onClick={() => setResolvingId(msg.id)} style={{width: '100%'}}>
                    ✓ 確認・対応する
                  </button>
                )}
              </div>
            )}
            
            {msg.is_resolved && (
              <div style={{marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--success-color)', fontSize: '0.875rem'}}>
                <strong>✅ 対応済</strong> ({msg.resolved_by})
                {msg.resolved_memo && <div>メモ: {msg.resolved_memo}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MobileView;
