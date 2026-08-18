import React, { useState } from 'react';
import { Phone, AlertTriangle, Clock, CheckCircle, Search, Filter, Plus, User, Building2, ExternalLink } from 'lucide-react';
import CallMemoCard from './CallMemoCard';

export default function DeskMonitorView({
  users, departments, groups, contacts, callMemos, currentUser, 
  onSubmitCallMemo, onUpdateStatus, onOpenThread, onOpenNewCallMemo
}) {
  const [filterStatus, setFilterStatus] = useState('unresolved'); // 'unresolved', 'all', 'resolved'
  const [filterDept, setFilterDept] = useState('');
  const [search, setSearch] = useState('');

  // Quick form state
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [callType, setCallType] = useState('callback');
  const [subject, setSubject] = useState('折り返しのお願い');
  const [body, setBody] = useState('');
  const [saveContact, setSaveContact] = useState(true);

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

    // Default target is first dept or user
    const targetType = selectedUserIds.length > 0 ? 'dm' : selectedDeptIds.length > 0 ? 'department' : 'department';
    const targetId = selectedUserIds[0] || selectedDeptIds[0] || (departments[0]?.id || 1);

    onSubmitCallMemo({
      company_name: companyName.trim(),
      contact_person: contactPerson.trim(),
      phone_number: phoneNumber.trim(),
      target_type: targetType,
      target_id: Number(targetId),
      call_type: callType,
      subject,
      body: body.trim(),
      save_contact: saveContact,
      created_by: currentUser?.id || 1
    });

    setCompanyName('');
    setContactPerson('');
    setPhoneNumber('');
    setBody('');
    setSelectedDeptIds([]);
    setSelectedUserIds([]);
  };

  return (
    <div className="desk-monitor-layout">
      {/* Left: Quick Call Registration Form */}
      <div className="desk-form-pane">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <div className="app-brand-icon" style={{ width: '32px', height: '32px' }}>
            <Phone size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>受電メモ登録（デスク）</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>受電者: {currentUser?.name}</div>
          </div>
        </div>

        <form onSubmit={handleQuickSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="form-group">
            <label className="form-label">相手先会社名 <span style={{ color: '#ef4444' }}>*</span></label>
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

          {/* Department / User Target Picker */}
          <div className="form-group">
            <label className="form-label">宛先部署（複数選択可）</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {departments.map(d => {
                const active = selectedDeptIds.includes(d.id);
                return (
                  <button 
                    key={d.id} 
                    type="button" 
                    className={`dept-chip ${active ? 'active' : ''}`}
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    onClick={() => {
                      if (active) setSelectedDeptIds(selectedDeptIds.filter(id => id !== d.id));
                      else setSelectedDeptIds([...selectedDeptIds, d.id]);
                    }}
                  >
                    🏢 {d.name}
                  </button>
                );
              })}
            </div>
          </div>

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
                style={{ fontSize: '0.75rem', justifyContent: 'center', background: callType === 'urgent' ? '#fee2e2' : '' }}
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
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {filteredMemos.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
              受電メモはありません
            </div>
          ) : (
            filteredMemos.map(m => {
              const adaptedMsg = {
                id: m.id,
                memo_id: m.id,
                memo_company: m.company_name,
                memo_contact: m.contact_person,
                memo_phone: m.phone_number,
                memo_subject: m.subject,
                memo_body: m.body,
                memo_type: m.call_type,
                memo_status: m.status,
                memo_resolved_note: m.resolved_note,
                memo_resolved_at: m.resolved_at,
                memo_resolver_name: m.resolver_name,
                thread_count: 0
              };
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
