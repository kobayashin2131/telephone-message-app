import React, { useState } from 'react';
import { Phone, AlertTriangle, Clock, CheckCircle, Search, Filter, Plus, User, Building2, ExternalLink } from 'lucide-react';
import CallMemoCard from './CallMemoCard';
import { adaptCallMemo } from '../utils/memoAdapter';

export default function DeskMonitorView({
  users, departments, groups, contacts, callMemos, currentUser, callCategories = [],
  onSubmitCallMemo, onUpdateStatus, onOpenThread, onOpenNewCallMemo
}) {
  const [filterStatus, setFilterStatus] = useState('unresolved'); // 'unresolved', 'all', 'resolved'
  const [filterDept, setFilterDept] = useState('');
  const [search, setSearch] = useState('');

  // Quick form state
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [targetCategory, setTargetCategory] = useState('user'); // 'user', 'dept', 'group'
  const [targetId, setTargetId] = useState(users[0]?.id || 1);
  const [mentionTarget, setMentionTarget] = useState('');
  const [callType, setCallType] = useState('callback');
  const [subject, setSubject] = useState('折り返しのお願い');
  const [body, setBody] = useState('');
  const [saveContact, setSaveContact] = useState(true);
  const [categoryId, setCategoryId] = useState(null);

  // 宛先から部門を解決（部署宛てはそのまま、担当者宛てはその人の所属部門、グループ宛ては未対応）
  const resolvedDepartmentId = targetCategory === 'dept'
    ? Number(targetId)
    : targetCategory === 'user'
      ? users.find(u => Number(u.id) === Number(targetId))?.department_id
      : null;
  const availableCategories = resolvedDepartmentId
    ? callCategories.filter(c => c.department_id === resolvedDepartmentId)
    : [];

  // Filter groups: only show groups the current user belongs to (or created)
  const myGroups = groups.filter(g => {
    if (!currentUser) return true;
    if (g.member_ids && Array.isArray(g.member_ids)) {
      return g.member_ids.includes(currentUser.id) || g.created_by === currentUser.id;
    }
    return true;
  });

  const filteredMemos = callMemos.filter(m => {
    if (filterStatus === 'unresolved' && m.status === 'resolved') return false;
    if (filterStatus === 'resolved' && m.status !== 'resolved') return false;
    if (search) {
      const q = search.toLowerCase();
      const match = m.company_name.toLowerCase().includes(q) ||
        (m.contact_person && m.contact_person.toLowerCase().includes(q)) ||
        (m.phone_number && m.phone_number.includes(q)) ||
        (m.body && m.body.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (!companyName.trim()) return alert('会社名を入力してください');

    const mappedTargetType = targetCategory === 'user' ? 'dm' : targetCategory === 'dept' ? 'department' : 'group';
    const finalTargetId = Number(targetId) || (targetCategory === 'user' ? users[0]?.id : departments[0]?.id || 1);

    let finalBody = body.trim();
    if (targetCategory !== 'user' && mentionTarget) {
      const mentionTag = mentionTarget === 'all' ? '@全員' : `@${mentionTarget}`;
      finalBody = `${mentionTag} ${finalBody}`.trim();
    }

    onSubmitCallMemo({
      company_name: companyName.trim(),
      contact_person: contactPerson.trim(),
      phone_number: phoneNumber.trim(),
      target_type: mappedTargetType,
      target_id: finalTargetId,
      call_type: callType,
      category_id: categoryId,
      subject,
      body: finalBody,
      save_contact: saveContact,
      created_by: currentUser?.id || 1
    });

    setCompanyName('');
    setContactPerson('');
    setPhoneNumber('');
    setBody('');
    setMentionTarget('');
    setCategoryId(null);
  };

  return (
    <div className="desk-monitor-layout">
      {/* Left: Quick Call Registration Form */}
      <div className="desk-form-pane">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f2ede1', paddingBottom: '12px' }}>
          <div className="app-brand-icon" style={{ width: '32px', height: '32px' }}>
            <Phone size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e2620' }}>受電メモ登録（デスク）</div>
            <div style={{ fontSize: '0.75rem', color: '#48564c' }}>受電者: {currentUser?.name}</div>
          </div>
        </div>

        <form onSubmit={handleQuickSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="form-group">
            <label className="form-label">相手先会社名 <span style={{ color: '#d97a6c' }}>*</span></label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="例: 株式会社オアシス商事" 
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="form-group">
              <label className="form-label">担当者名</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="例: 山田 様" 
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">電話番号</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="例: 03-xxxx-xxxx" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Destination Target Picker */}
          <div className="form-group" style={{ background: '#f7f4ec', padding: '10px', borderRadius: '8px', border: '1px solid #e5dfd3' }}>
            <label className="form-label" style={{ marginBottom: '6px', color: '#38443c', display: 'flex', justifyContent: 'space-between' }}>
              <span>📢 宛先（通知先） <span style={{ color: '#d97a6c' }}>*</span></span>
            </label>
            
            {/* Target Category Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '8px' }}>
              <button
                type="button"
                className={`dept-chip ${targetCategory === 'user' ? 'active' : ''}`}
                style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '4px 6px' }}
                onClick={() => {
                  setTargetCategory('user');
                  setTargetId(users[0]?.id || 1);
                  setCategoryId(null);
                }}
              >
                👤 担当者
              </button>
              <button
                type="button"
                className={`dept-chip ${targetCategory === 'dept' ? 'active' : ''}`}
                style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '4px 6px' }}
                onClick={() => {
                  setTargetCategory('dept');
                  setTargetId(departments[0]?.id || 1);
                  setCategoryId(null);
                }}
              >
                🏢 部署
              </button>
              <button
                type="button"
                className={`dept-chip ${targetCategory === 'group' ? 'active' : ''}`}
                style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '4px 6px' }}
                onClick={() => {
                  setTargetCategory('group');
                  setTargetId(groups[0]?.id || 1);
                  setCategoryId(null);
                }}
              >
                💬 グループ
              </button>
            </div>

            {/* Target Item Selector */}
            {targetCategory === 'user' && (
              <select
                className="form-select"
                value={targetId}
                onChange={(e) => { setTargetId(e.target.value); setCategoryId(null); }}
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    👤 {u.name} {u.department_name ? `(${u.department_name})` : ''}
                  </option>
                ))}
              </select>
            )}

            {targetCategory === 'dept' && (
              departments.length > 0 ? (
                <select
                  className="form-select"
                  value={targetId}
                  onChange={(e) => { setTargetId(e.target.value); setCategoryId(null); }}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      🏢 {d.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#8c7650', padding: '4px 0' }}>
                  ※ 部署がまだ登録されていません。「担当者」から選択してください。
                </div>
              )
            )}

            {targetCategory === 'group' && (
              myGroups.length > 0 ? (
                <select
                  className="form-select"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  {myGroups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.icon || '💬'} {g.name} ({g.member_count || 0}名)
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#8c7650', padding: '4px 0' }}>
                  ※ 所属しているグループがありません。「担当者」から選択してください。
                </div>
              )
            )}

            {/* Mention inside Department or Group */}
            {targetCategory !== 'user' && (
              <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #ded6c5' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b5590', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <span>📢 担当者を指名・メンション（任意）</span>
                </label>
                <select
                  className="form-select"
                  value={mentionTarget}
                  onChange={(e) => setMentionTarget(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem', background: '#ffffff' }}
                >
                  <option value="">指定なし（全体宛て）</option>
                  <option value="all">📢 @全員 に通知</option>
                  {users.map(u => (
                    <option key={u.id} value={u.name}>
                      👤 @{u.name} {u.department_name ? `(${u.department_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Category (department-specific, optional) */}
          {availableCategories.length > 0 && (
            <div className="form-group">
              <label className="form-label">受電カテゴリ（任意）</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                <button
                  type="button"
                  className={`dept-chip ${categoryId === null ? 'active' : ''}`}
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => setCategoryId(null)}
                >
                  指定なし
                </button>
                {availableCategories.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={`dept-chip ${categoryId === c.id ? 'active' : ''}`}
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setCategoryId(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Call Type */}
          <div className="form-group">
            <label className="form-label">種別</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              <button 
                type="button" 
                className={`dept-chip ${callType === 'callback' ? 'active' : ''}`} 
                style={{ fontSize: '0.75rem', justifyContent: 'center' }}
                onClick={() => setCallType('callback')}
              >
                📞 折り返し
              </button>
              <button 
                type="button" 
                className={`dept-chip ${callType === 'urgent' ? 'active' : ''}`} 
                style={{ fontSize: '0.75rem', justifyContent: 'center', background: callType === 'urgent' ? '#fbe8e4' : '' }}
                onClick={() => setCallType('urgent')}
              >
                🚨 緊急
              </button>
              <button 
                type="button" 
                className={`dept-chip ${callType === 'info_only' ? 'active' : ''}`} 
                style={{ fontSize: '0.75rem', justifyContent: 'center' }}
                onClick={() => setCallType('info_only')}
              >
                ℹ️ 伝言
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">伝言内容</label>
            <textarea 
              className="form-textarea" 
              rows="3" 
              placeholder="折り返し希望時間や用件の詳細など" 
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <button type="submit" className="pop-btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
            <Phone size={16} /> 受電メモを送信
          </button>
        </form>
      </div>

      {/* Right: Live Call Memo Monitor Board */}
      <div className="desk-board-pane">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '14px 20px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`tab-mode-btn ${filterStatus === 'unresolved' ? 'active' : ''}`}
              onClick={() => setFilterStatus('unresolved')}
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            >
              ⚠️ 未対応 ({callMemos.filter(m => m.status !== 'resolved').length}件)
            </button>
            <button 
              className={`tab-mode-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            >
              全件 ({callMemos.length}件)
            </button>
            <button 
              className={`tab-mode-btn ${filterStatus === 'resolved' ? 'active' : ''}`}
              onClick={() => setFilterStatus('resolved')}
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            >
              ✓ 完了済 ({callMemos.filter(m => m.status === 'resolved').length}件)
            </button>
          </div>

          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} color="#5e6b60" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="検索..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '30px', fontSize: '0.85rem', width: '100%' }}
            />
          </div>
        </div>

        <div className="cards-grid">
          {filteredMemos.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#5e6b60' }}>
              受電メモはありません
            </div>
          ) : (
            filteredMemos.map(m => {
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
    </div>
  );
}
