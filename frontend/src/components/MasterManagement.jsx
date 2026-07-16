import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function MasterManagement({ departments, users, onDataChanged }) {
  const [newDepName, setNewDepName] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserDepId, setNewUserDepId] = useState('');

  const addDepartment = async (e) => {
    e.preventDefault();
    if (!newDepName) return;
    await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newDepName })
    });
    setNewDepName('');
    onDataChanged();
  };

  const deleteDepartment = async (id) => {
    if (!confirm('本当に削除しますか？')) return;
    await fetch(`/api/departments/${id}`, { method: 'DELETE' });
    onDataChanged();
  };

  const addUser = async (e) => {
    e.preventDefault();
    if (!newUserName) return;
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newUserName, department_id: newUserDepId || null })
    });
    setNewUserName('');
    setNewUserDepId('');
    onDataChanged();
  };

  const deleteUser = async (id) => {
    if (!confirm('本当に削除しますか？')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    onDataChanged();
  };

  return (
    <div className="glass" style={{ padding: '2rem', marginTop: '2rem', color: 'white' }}>
      <h2>⚙️ マスタ管理</h2>
      <p style={{ opacity: 0.8, marginBottom: '2rem' }}>部署（グループ）や個人の追加・削除を行います。</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Department Management */}
        <div className="glass" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)' }}>
          <h3>部署（グループ）管理</h3>
          <form onSubmit={addDepartment} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input 
              type="text" 
              placeholder="新規部署名" 
              value={newDepName} 
              onChange={e => setNewDepName(e.target.value)} 
              className="input"
            />
            <button type="submit" className="btn btn-primary">追加</button>
          </form>
          
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {departments.map(d => (
              <li key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span>{d.name}</span>
                <button onClick={() => deleteDepartment(d.id)} className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: 'rgba(255,0,0,0.2)' }}>削除</button>
              </li>
            ))}
          </ul>
        </div>

        {/* User Management */}
        <div className="glass" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)' }}>
          <h3>個人（ユーザー）管理</h3>
          <form onSubmit={addUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <input 
              type="text" 
              placeholder="新規ユーザー名" 
              value={newUserName} 
              onChange={e => setNewUserName(e.target.value)} 
              className="input"
            />
            <select value={newUserDepId} onChange={e => setNewUserDepId(e.target.value)} className="input">
              <option value="">-- 所属部署を選択 (任意) --</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary">追加</button>
          </form>
          
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {users.map(u => {
              const dep = departments.find(d => d.id === u.department_id);
              return (
                <li key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span>{u.name} <small style={{opacity: 0.6}}>({dep ? dep.name : '部署なし'})</small></span>
                  <button onClick={() => deleteUser(u.id)} className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: 'rgba(255,0,0,0.2)' }}>削除</button>
                </li>
              )
            })}
          </ul>
        </div>

      </div>
    </div>
  );
}

export default MasterManagement;
