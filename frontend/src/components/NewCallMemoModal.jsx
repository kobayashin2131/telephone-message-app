import React, { useState, useEffect } from 'react';
import { X, Phone, User, Building2, Users, AlertTriangle, Clock, Check, Search, PlusCircle } from 'lucide-react';

const COMMON_SUBJECTS = ['折り返しのお願い', '見積もり仕様確認の件', '納期・出荷日の確認', '現場施工日程の調整', '定期保守・点検の件', 'ご挨拶・アポイント'];

export default function NewCallMemoModal({
  onClose, users, departments, groups, contacts, callCategories = [], currentUserId, defaultTarget, prefillContact, onSubmitCallMemo
}) {
  const [companyName, setCompanyName] = useState(prefillContact?.company_name || '');
  const [contactPerson, setContactPerson] = useState(prefillContact?.contact_person || '');
  const [phoneNumber, setPhoneNumber] = useState(prefillContact?.phone_number || '');
  const [frequentNotes, setFrequentNotes] = useState(prefillContact?.frequent_notes || '');
  const [selectedContactId, setSelectedContactId] = useState(prefillContact?.id || null);
  const [saveContact, setSaveContact] = useState(true);

  // Search suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Target Destination
  const [targetType, setTargetType] = useState(defaultTarget?.type || 'dm');
  const [targetId, setTargetId] = useState(defaultTarget?.id || (users[0]?.id || 1));
  const [mentionTarget, setMentionTarget] = useState('');

  // Call Details
  const [callType, setCallType] = useState('callback');
  const [subject, setSubject] = useState(COMMON_SUBJECTS[0]);
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState(null);

  // 宛先から部門を解決（部門宛てはそのまま、個人DM宛てはその人の所属部門、グループ宛ては未対応）
  const resolvedDepartmentId = targetType === 'department'
    ? Number(targetId)
    : targetType === 'dm'
      ? users.find(u => Number(u.id) === Number(targetId))?.department_id
      : null;
  const availableCategories = resolvedDepartmentId
    ? callCategories.filter(c => c.department_id === resolvedDepartmentId)
    : [];

  useEffect(() => {
    if (!availableCategories.some(c => c.id === categoryId)) setCategoryId(null);
  }, [resolvedDepartmentId]);

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

    let finalBody = body.trim();
    if (targetType !== 'dm' && mentionTarget) {
      const mentionTag = mentionTarget === 'all' ? '@全員' : `@${mentionTarget}`;
      finalBody = `${mentionTag} ${finalBody}`.trim();
    }

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
      category_id: categoryId,
      subject,
      body: finalBody,
      created_by: currentUserId
    });
    onClose();
  };

  // Filter groups: only show groups the current user belongs to (or created)
  const myGroups = groups.filter(g => {
    if (!currentUserId) return true;
    if (g.member_ids && Array.isArray(g.member_ids)) {
      return g.member_ids.includes(currentUserId) || g.created_by === currentUserId;
    }
    return true;
  });

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <Phone size={20} color="#7d68a8" />
            受電メモ登録（チャットカード連携）
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            
            {/* 1. Destination Picker */}
            <div className="form-group" style={{ background: '#f7f3fb', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd0ee' }}>
              <label className="form-label" style={{ color: '#6b5590' }}>📢 通知先チャット（宛先） <span style={{ color: '#d97a6c' }}>*</span></label>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                <select 
                  className="form-select"
                  value={targetType}
                  onChange={(e) => {
                    setTargetType(e.target.value);
                    if (e.target.value === 'dm') setTargetId(users[0]?.id || 1);
                    else if (e.target.value === 'group') setTargetId(myGroups[0]?.id || 1);
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
                  {targetType === 'group' && myGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.icon} {g.name} ({g.member_count}名)</option>
                  ))}
                  {targetType === 'department' && departments.map(d => (
                    <option key={d.id} value={d.id}>🏢 {d.name} ({d.user_count}名)</option>
                  ))}
                </select>
              </div>

              {/* Mention inside Department or Group */}
              {targetType !== 'dm' && (
                <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #d1c2e4' }}>
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

            {/* 2. Caller Contact Info with Autocomplete */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🏢 相手先会社名（受電先リストから検索・登録） <span style={{ color: '#d97a6c' }}>*</span></span>
                {selectedContactId && (
                  <span style={{ fontSize: '0.75rem', color: '#6fa382', fontWeight: 600 }}>✓ 登録済み受電先を選択中</span>
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
                  background: '#ffffff', border: '1px solid #d4ccbc', borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto'
                }}>
                  {suggestions.map(s => (
                    <div 
                      key={s.id}
                      style={{ padding: '8px 12px', borderBottom: '1px solid #f2ede1', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onClick={() => selectContact(s)}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8f5ef'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e2620' }}>{s.company_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#48564c' }}>
                          担当: {s.contact_person || '指定なし'} | 📞 {s.phone_number}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.7rem', background: '#f7f3fb', color: '#7d68a8', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
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
              <div style={{ fontSize: '0.8rem', background: '#f8f0dc', border: '1px solid #ecdba0', padding: '6px 10px', borderRadius: '6px', color: '#8a6d33' }}>
                💡 <strong>この相手の定番メモ:</strong> {frequentNotes}
              </div>
            )}

            {!selectedContactId && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#4a5750', cursor: 'pointer' }}>
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
                  style={{ justifyContent: 'center', borderColor: callType === 'urgent' ? '#e09a8d' : '', background: callType === 'urgent' ? '#fbe8e4' : '' }}
                >
                  <AlertTriangle size={14} color={callType === 'urgent' ? '#a8503f' : ''} /> 🚨 緊急
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

            {/* Category (department-specific, optional) */}
            {availableCategories.length > 0 && (
              <div className="form-group">
                <label className="form-label">受電カテゴリ（任意）</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    type="button"
                    className={`dept-chip ${categoryId === null ? 'active' : ''}`}
                    onClick={() => setCategoryId(null)}
                  >
                    指定なし
                  </button>
                  {availableCategories.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={`dept-chip ${categoryId === c.id ? 'active' : ''}`}
                      onClick={() => setCategoryId(c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                      border: '1px solid #d4ccbc', background: subject === s ? '#efe9f8' : '#f8f5ef',
                      color: subject === s ? '#6b5590' : '#4a5750', cursor: 'pointer'
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
