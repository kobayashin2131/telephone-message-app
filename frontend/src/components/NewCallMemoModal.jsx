import React, { useState, useEffect } from 'react';
import { X, Phone, User, Building2, Users, AlertTriangle, Clock, Check, Search, PlusCircle } from 'lucide-react';

const COMMON_SUBJECTS = ['折り返しのお願い', '見積もり仕様確認の件', '納期・出荷日の確認', '現場施工日程の調整', '定期保守・点検の件', 'ご挨拶・アポイント'];

export default function NewCallMemoModal({ 
  isOpen, onClose, users, departments, groups, contacts, currentUserId, defaultTarget, onSubmitCallMemo 
}) {
  if (!isOpen) return null;

  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [frequentNotes, setFrequentNotes] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [saveContact, setSaveContact] = useState(true);

  // Search suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Target Destination
  const [targetType, setTargetType] = useState(defaultTarget?.type || 'dm');
  const [targetId, setTargetId] = useState(defaultTarget?.id || (users[0]?.id || 1));

  // Call Details
  const [callType, setCallType] = useState('callback');
  const [subject, setSubject] = useState(COMMON_SUBJECTS[0]);
  const [body, setBody] = useState('');

  // Filter autocomplete contacts
  useEffect(() => {
    if (!companyName.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const q = companyName.toLowerCase();
    const matches = contacts.filter(c => 
      c.company_name.toLowerCase().includes(q) ||
      (c.contact_person && c.contact_person.toLowerCase().includes(q)) ||
      (c.phone_number && c.phone_number.includes(q))
    );
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }, [companyName, contacts]);

  const selectContact = (c) => {
    setSelectedContactId(c.id);
    setCompanyName(c.company_name);
    setContactPerson(c.contact_person || '');
    setPhoneNumber(c.phone_number || '');
    setFrequentNotes(c.frequent_notes || '');
    setShowSuggestions(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!companyName.trim()) return alert('会社名を入力してください');

    onSubmitCallMemo({
      caller_contact_id: selectedContactId,
      company_name: companyName.trim(),
      contact_person: contactPerson.trim(),
      phone_number: phoneNumber.trim(),
      frequent_notes: frequentNotes.trim(),
      save_contact: saveContact && !selectedContactId,
      target_type: targetType,
      target_id: Number(targetId),
      call_type: callType,
      subject,
      body: body.trim(),
      created_by: currentUserId
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <Phone size={20} color="#2563eb" />
            受電メモ登録（チャットカード連携）
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            
            {/* 1. Destination Picker */}
            <div className="form-group" style={{ background: '#eff6ff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <label className="form-label" style={{ color: '#1e40af' }}>📢 通知先チャット（宛先） <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                <select 
                  className="form-select"
                  value={targetType}
                  onChange={(e) => {
                    setTargetType(e.target.value);
                    if (e.target.value === 'dm') setTargetId(users[0]?.id || 1);
                    else if (e.target.value === 'group') setTargetId(groups[0]?.id || 1);
                    else if (e.target.value === 'department') setTargetId(departments[0]?.id || 1);
                  }}
                >
                  <option value="dm">👤 個人（DM）</option>
                  <option value="group">👥 グループ</option>
                  <option value="department">🏢 部門全体</option>
                </select>

                <select 
                  className="form-select"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  {targetType === 'dm' && users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.department_name || '未所属'})</option>
                  ))}
                  {targetType === 'group' && groups.map(g => (
                    <option key={g.id} value={g.id}>{g.icon} {g.name} ({g.member_count}名)</option>
                  ))}
                  {targetType === 'department' && departments.map(d => (
                    <option key={d.id} value={d.id}>🏢 {d.name} ({d.user_count}名)</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Caller Contact Info with Autocomplete */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🏢 相手先会社名（受電先リストから検索・登録） <span style={{ color: '#ef4444' }}>*</span></span>
                {selectedContactId && (
                  <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>✓ 登録済み受電先を選択中</span>
                )}
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="会社名を入力（入力すると候補が表示されます）" 
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setSelectedContactId(null);
                }}
                required
              />

              {/* Suggestions dropdown */}
              {showSuggestions && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto'
                }}>
                  {suggestions.map(s => (
                    <div 
                      key={s.id}
                      style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onClick={() => selectContact(s)}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{s.company_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          担当: {s.contact_person || '指定なし'} | 📞 {s.phone_number}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        過去{s.call_count}回受電
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact Person & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">相手のお名前 / 役職</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="例: 山田 太郎 様 / 営業課長" 
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">電話番号</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="例: 03-1234-5678 / 090-xxxx-xxxx" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Frequent Notes (CRM preview) */}
            {frequentNotes && (
              <div style={{ fontSize: '0.8rem', background: '#fefce8', border: '1px solid #fef08a', padding: '6px 10px', borderRadius: '6px', color: '#854d0e' }}>
                💡 <strong>この相手の定番メモ:</strong> {frequentNotes}
              </div>
            )}

            {!selectedContactId && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={saveContact} 
                  onChange={(e) => setSaveContact(e.target.checked)} 
                />
                この会社情報を受電先リスト（顧客台帳）に新規保存する
              </label>
            )}

            {/* Urgency / Call Type */}
            <div className="form-group">
              <label className="form-label">受電種別・緊急度</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  className={`dept-chip ${callType === 'callback' ? 'active' : ''}`}
                  onClick={() => setCallType('callback')}
                  style={{ justifyContent: 'center' }}
                >
                  <Phone size={14} /> 📞 折り返し希望
                </button>
                <button
                  type="button"
                  className={`dept-chip ${callType === 'urgent' ? 'active' : ''}`}
                  onClick={() => setCallType('urgent')}
                  style={{ justifyContent: 'center', borderColor: callType === 'urgent' ? '#f87171' : '', background: callType === 'urgent' ? '#fee2e2' : '' }}
                >
                  <AlertTriangle size={14} color={callType === 'urgent' ? '#b91c1c' : ''} /> 🚨 緊急
                </button>
                <button
                  type="button"
                  className={`dept-chip ${callType === 'info_only' ? 'active' : ''}`}
                  onClick={() => setCallType('info_only')}
                  style={{ justifyContent: 'center' }}
                >
                  <Clock size={14} /> ℹ️ 伝言のみ
                </button>
              </div>
            </div>

            {/* Common Subject Buttons */}
            <div className="form-group">
              <label className="form-label">件名 / 用件</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                {COMMON_SUBJECTS.map(s => (
                  <button 
                    key={s} 
                    type="button"
                    style={{
                      fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px',
                      border: '1px solid #cbd5e1', background: subject === s ? '#dbeafe' : '#f8fafc',
                      color: subject === s ? '#1e40af' : '#475569', cursor: 'pointer'
                    }}
                    onClick={() => setSubject(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <input 
                type="text" 
                className="form-input" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                required 
              />
            </div>

            {/* Message Body */}
            <div className="form-group">
              <label className="form-label">伝言詳細・メモ</label>
              <textarea 
                className="form-textarea" 
                rows="3" 
                placeholder="例: 本日17時まで社内、それ以降は携帯へ。見積書の仕様変更について確認希望とのこと。" 
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>キャンセル</button>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} /> 受電メモを送信
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
