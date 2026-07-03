import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Link } from 'react-router-dom';

function Dashboard({ departments, users, messages, onDataChanged }) {
  const [receiverName, setReceiverName] = useState('');
  const [callerName, setCallerName] = useState('');
  const [callerNumber, setCallerNumber] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [targetMode, setTargetMode] = useState('department'); // 'department' or 'individual'
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [message, setMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [monitorTab, setMonitorTab] = useState('unresolved'); // 'unresolved' or 'resolved'

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!receiverName || !callerName || !message || !selectedDeptId) {
      alert("必須項目を入力してください");
      return;
    }
    
    let targets = [];
    if (targetMode === 'department') {
      targets.push({ type: 'department', department_id: selectedDeptId });
    } else {
      if (selectedUserIds.length === 0) {
        alert("個人を1名以上選択してください");
        return;
      }
      selectedUserIds.forEach(uid => {
        targets.push({ type: 'user', department_id: selectedDeptId, user_id: uid });
      });
    }

    setIsSubmitting(true);
    try {
      const body = {
        receiver_name: receiverName,
        caller_name: callerName,
        caller_number: callerNumber,
        message,
        is_urgent: isUrgent,
        targets
      };

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setCallerName('');
        setCallerNumber('');
        setMessage('');
        setIsUrgent(false);
        setSelectedUserIds([]);
        onDataChanged();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserSelection = (id) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter(u => u !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  const isUnattended = (msg) => {
    if (msg.is_resolved) return false;
    const diffHours = (new Date() - new Date(msg.created_at)) / (1000 * 60 * 60);
    return diffHours > 1;
  };

  const unresolvedMessages = messages.filter(m => !m.is_resolved);
  const resolvedMessages = messages.filter(m => m.is_resolved);
  const displayMessages = monitorTab === 'unresolved' ? unresolvedMessages : resolvedMessages;

  return (
    <div className="dashboard-grid">
      <div className="card glass">
        <h2 className="card-title">📱 新規連絡受付</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>電話対応者 (あなたのお名前) (必須)</label>
            <input 
              className="form-control" 
              type="text" 
              placeholder="例: 佐藤" 
              value={receiverName} 
              onChange={e => setReceiverName(e.target.value)} 
              required
            />
          </div>
          <hr style={{margin: '1.5rem 0', borderColor: 'var(--border-color)'}}/>
          
          <div className="form-group">
            <label>発信者名 (必須)</label>
            <input 
              className="form-control" 
              type="text" 
              placeholder="〇〇株式会社 田中様" 
              value={callerName} 
              onChange={e => setCallerName(e.target.value)} 
              required
            />
          </div>
          <div className="form-group">
            <label>電話番号</label>
            <input 
              className="form-control" 
              type="text" 
              placeholder="090-XXXX-XXXX" 
              value={callerNumber} 
              onChange={e => setCallerNumber(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>宛先: 部署を選択 (必須)</label>
            <select className="form-control" value={selectedDeptId} onChange={e => {setSelectedDeptId(e.target.value); setSelectedUserIds([]);}} required>
              <option value="">選択してください...</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {selectedDeptId && (
            <div className="form-group glass" style={{padding: '1rem', borderRadius: 'var(--radius-md)'}}>
              <label>宛先範囲</label>
              <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                <label className="checkbox-label">
                  <input type="radio" name="targetMode" checked={targetMode === 'department'} onChange={() => setTargetMode('department')} style={{accentColor: 'var(--primary-color)'}}/> 部署全体
                </label>
                <label className="checkbox-label">
                  <input type="radio" name="targetMode" checked={targetMode === 'individual'} onChange={() => setTargetMode('individual')} style={{accentColor: 'var(--primary-color)'}}/> 個人を指定
                </label>
              </div>

              {targetMode === 'individual' && (
                <div>
                  <label>対象者 (複数選択可)</label>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem'}}>
                    {users.filter(u => u.department_id === parseInt(selectedDeptId)).map(u => (
                      <button 
                        key={u.id} 
                        type="button" 
                        onClick={() => toggleUserSelection(u.id)}
                        className={`filter-chip ${selectedUserIds.includes(u.id) ? 'active' : ''}`}
                      >
                        {selectedUserIds.includes(u.id) ? '✓ ' : ''}{u.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label>用件 (必須)</label>
            <textarea 
              className="form-control" 
              rows="4" 
              placeholder="折り返しのお電話をお願いします。" 
              value={message} 
              onChange={e => setMessage(e.target.value)}
              required
            ></textarea>
          </div>

          <div className="form-group" style={{ margin: '1.5rem 0' }}>
            <label className="checkbox-label">
              <input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} />
              <span style={{color: 'var(--danger-color)', fontWeight: '600'}}>🔥 緊急連絡 (Push/Chat通知を優先)</span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? '送信中...' : '連絡を登録'}
          </button>
        </form>
      </div>

      <div>
        <div className="card glass" style={{marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2 className="card-title" style={{margin: 0}}>📋 状況モニター</h2>
          <Link to="/history" className="btn" style={{backgroundColor: 'var(--surface-color-light)', color: 'white', padding: '0.5rem 1rem'}}>
            🔍 履歴を検索
          </Link>
        </div>

        <div className="view-toggle" style={{marginBottom: '1rem', width: '100%', display: 'flex'}}>
          <button style={{flex: 1}} className={monitorTab === 'unresolved' ? 'active' : ''} onClick={() => setMonitorTab('unresolved')}>
            未対応 ({unresolvedMessages.length})
          </button>
          <button style={{flex: 1}} className={monitorTab === 'resolved' ? 'active' : ''} onClick={() => setMonitorTab('resolved')}>
            対応済 ({resolvedMessages.length})
          </button>
        </div>

        <div className="message-list">
          {displayMessages.length === 0 && <p style={{color: 'var(--text-secondary)'}}>該当する連絡はありません。</p>}
          {displayMessages.map(msg => (
            <div key={msg.id} className={`message-item glass card ${msg.is_resolved ? 'resolved' : ''} ${msg.is_urgent ? 'urgent' : ''} ${isUnattended(msg) ? 'unattended' : ''}`} style={{padding: '1rem'}}>
              <div className="message-header">
                <div>
                  <div className="caller-info">{msg.caller_name} 様より</div>
                  {msg.caller_number && <div className="caller-number">📞 {msg.caller_number}</div>}
                </div>
                <div className="message-meta">
                  {msg.is_urgent && <span className="badge badge-urgent">緊急</span>}
                  {isUnattended(msg) && <span className="badge badge-unattended">未対応アラート</span>}
                  <span className="badge badge-target">宛: {msg.targets.map(t => t.name).join(', ')}</span>
                </div>
              </div>
              <div className="message-body">
                {msg.message}
              </div>
              <div style={{marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between'}}>
                <span>受付: {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ja })} (受電: {msg.receiver_name})</span>
                <span>
                  {msg.is_resolved 
                    ? `✅ 対応済 (${msg.resolved_by}) ${msg.resolved_memo ? ' - ' + msg.resolved_memo : ''}`
                    : '⏳ 未対応'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
