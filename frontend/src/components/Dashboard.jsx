import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Link } from 'react-router-dom';

function Dashboard({ departments, users, messages, onDataChanged, currentUser }) {
  const [receiverName, setReceiverName] = useState('');
  const [callerName, setCallerName] = useState('');
  const [callerNumber, setCallerNumber] = useState('');
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [targetMode, setTargetMode] = useState('department'); // 'department' or 'individual'
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [message, setMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [monitorTab, setMonitorTab] = useState('unresolved'); // 'unresolved' or 'resolved'
  const [filterDept, setFilterDept] = useState('');
  const [filterUser, setFilterUser] = useState('');

  useEffect(() => {
    if (currentUser && receiverName === '') {
      setReceiverName(currentUser.name);
    }
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!receiverName || !callerName || !message || selectedDeptIds.length === 0) {
      alert("必須項目（宛先部署など）を入力してください");
      return;
    }
    
    let targets = [];
    if (targetMode === 'department') {
      selectedDeptIds.forEach(did => {
        targets.push({ type: 'department', department_id: parseInt(did) });
      });
    } else {
      if (selectedUserIds.length === 0) {
        alert("個人を1名以上選択してください");
        return;
      }
      selectedUserIds.forEach(uid => {
        const u = users.find(user => user.id === uid);
        targets.push({ type: 'user', department_id: u ? u.department_id : null, user_id: uid });
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
        setSelectedDeptIds([]);
        onDataChanged();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDeptSelection = (id) => {
    if (selectedDeptIds.includes(id)) {
      setSelectedDeptIds(selectedDeptIds.filter(d => d !== id));
      // Remove users that don't belong to selected departments anymore
      const updatedDepts = selectedDeptIds.filter(d => d !== id);
      const validUsers = users.filter(u => updatedDepts.includes(u.department_id)).map(u => u.id);
      setSelectedUserIds(selectedUserIds.filter(uid => validUsers.includes(uid)));
    } else {
      setSelectedDeptIds([...selectedDeptIds, id]);
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

  const filteredByList = messages.filter(m => {
    if (!filterDept && !filterUser) return true;
    return m.targets.some(t => {
      let matchDept = false;
      let matchUser = false;
      if (filterDept && t.department_id === parseInt(filterDept)) matchDept = true;
      if (filterUser && t.user_id === parseInt(filterUser)) matchUser = true;
      // If both filters are active, match either (OR) or match both (AND)?
      // For simplicity, if a filter is active, it must match.
      if (filterDept && filterUser) return matchDept && matchUser;
      if (filterDept) return matchDept;
      if (filterUser) return matchUser;
      return false;
    });
  });

  const unresolvedMessages = filteredByList.filter(m => !m.is_resolved);
  const resolvedMessages = filteredByList.filter(m => m.is_resolved);
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
            <label>宛先: 部署を選択 (複数選択可) (必須)</label>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem'}}>
              {departments.map(d => (
                <button 
                  key={d.id} 
                  type="button" 
                  onClick={() => toggleDeptSelection(d.id)}
                  className={`filter-chip ${selectedDeptIds.includes(d.id) ? 'active' : ''}`}
                >
                  {selectedDeptIds.includes(d.id) ? '✓ ' : ''}{d.name}
                </button>
              ))}
            </div>
          </div>

          {selectedDeptIds.length > 0 && (
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
                    {users.filter(u => selectedDeptIds.includes(u.department_id)).length === 0 && (
                      <span style={{color: 'var(--text-secondary)'}}>選択した部署にユーザーがいません。</span>
                    )}
                    {users.filter(u => selectedDeptIds.includes(u.department_id)).map(u => (
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
        <div className="card glass" style={{marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'}}>
          <h2 className="card-title" style={{margin: 0}}>📋 状況モニター</h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="form-control" style={{width: '150px', padding: '0.5rem'}} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">全ての部署</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className="form-control" style={{width: '150px', padding: '0.5rem'}} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
              <option value="">全ての個人</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <Link to="/history" className="btn btn-secondary" style={{padding: '0.5rem 1rem', textDecoration: 'none'}}>
              🔍 詳細検索
            </Link>
          </div>
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
