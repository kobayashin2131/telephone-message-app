import React, { useState, useEffect } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { ja } from 'date-fns/locale';

function HistoryView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = async () => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/messages/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    search(); // initial load
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') search();
  };

  return (
    <div className="card glass">
      <h2 className="card-title">🔍 全体連絡履歴・検索</h2>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        <input 
          type="text" 
          className="form-control" 
          placeholder="キーワード (発信者、受電者、用件など) で検索..." 
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn btn-primary" style={{width: 'auto'}} onClick={search} disabled={isSearching}>
          検索
        </button>
      </div>

      <div className="message-list">
        {results.length === 0 && !isSearching && (
          <p style={{textAlign: 'center', color: 'var(--text-secondary)'}}>条件に一致する履歴はありません。</p>
        )}
        
        {results.map(msg => (
          <div key={msg.id} className={`message-item glass card ${msg.is_resolved ? 'resolved' : ''} ${msg.is_urgent ? 'urgent' : ''}`} style={{padding: '1rem'}}>
            <div className="message-header">
              <div>
                <div className="caller-info">{msg.caller_name} 様より</div>
                {msg.caller_number && <div className="caller-number">📞 {msg.caller_number}</div>}
              </div>
              <div className="message-meta">
                {msg.is_urgent && <span className="badge badge-urgent">緊急</span>}
                <span className="badge badge-target">宛: {msg.targets.map(t => t.name).join(', ')}</span>
              </div>
            </div>
            <div className="message-body">
              {msg.message}
            </div>
            <div style={{marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem'}}>
              <div><strong>受付日時:</strong> {format(new Date(msg.created_at), 'yyyy/MM/dd HH:mm')}</div>
              <div><strong>受電者 (事務):</strong> {msg.receiver_name}</div>
              <div style={{gridColumn: '1 / -1'}}>
                <strong>対応状況:</strong> {msg.is_resolved 
                  ? `✅ 対応済 (${msg.resolved_by}) ${format(new Date(msg.resolved_at), 'yyyy/MM/dd HH:mm')} ${msg.resolved_memo ? ' - ' + msg.resolved_memo : ''}`
                  : '⏳ 未対応'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HistoryView;
