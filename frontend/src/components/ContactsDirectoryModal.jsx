import React, { useState } from 'react';
import { X, BookOpen, Plus, Search, Phone, Edit, Trash2, Building2 } from 'lucide-react';

export default function ContactsDirectoryModal({ onClose, contacts, onSaveContact, onDeleteContact, onOpenCallMemoForContact }) {
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ id: null, company_name: '', contact_person: '', phone_number: '', frequent_notes: '' });

  const filtered = contacts.filter(c => 
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_person && c.contact_person.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone_number && c.phone_number.includes(search))
  );

  const handleStartEdit = (c = null) => {
    if (c) {
      setEditForm(c);
    } else {
      setEditForm({ id: null, company_name: '', contact_person: '', phone_number: '', frequent_notes: '' });
    }
    setIsEditing(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!editForm.company_name || !editForm.phone_number) {
      return alert('会社名と電話番号は必須です');
    }
    onSaveContact(editForm);
    setIsEditing(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <BookOpen size={20} color="#7d68a8" />
            📇 受電先・顧客リスト（よくある発信元台帳）
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {isEditing ? (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#38443c', borderBottom: '1px solid #e8e2d8', paddingBottom: '6px' }}>
                {editForm.id ? '受電先情報の編集' : '新規受電先の登録'}
              </div>
              <div className="form-group">
                <label className="form-label">会社名 <span style={{ color: '#d97a6c' }}>*</span></label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editForm.company_name} 
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })} 
                  required 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">担当者名 / 役職</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editForm.contact_person || ''} 
                    onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">電話番号 <span style={{ color: '#d97a6c' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editForm.phone_number} 
                    onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} 
                    required 
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">定番の用件 / 注意事項メモ</label>
                <textarea 
                  className="form-textarea" 
                  rows="2" 
                  value={editForm.frequent_notes || ''} 
                  onChange={(e) => setEditForm({ ...editForm, frequent_notes: e.target.value })} 
                  placeholder="例: 見積もり納期確認の連絡が多い。担当は営業田中宛て。"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>キャンセル</button>
                <button type="submit" className="btn-primary">保存する</button>
              </div>
            </form>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} color="#5e6b60" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="会社名・担当者・電話番号で検索..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: '32px', width: '100%' }}
                  />
                </div>
                <button 
                  className="btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  onClick={() => handleStartEdit()}
                >
                  <Plus size={16} /> 新規登録
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#5e6b60', padding: '30px' }}>
                    登録されている受電先がありません
                  </div>
                ) : (
                  filtered.map(c => (
                    <div 
                      key={c.id}
                      style={{
                        border: '1px solid #e8e2d8', borderRadius: '8px', padding: '12px 16px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e2620', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          🏢 {c.company_name}
                          {c.contact_person && (
                            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#4a5750' }}>
                              ({c.contact_person})
                            </span>
                          )}
                          <span style={{ fontSize: '0.7rem', background: '#f7f3fb', color: '#7d68a8', padding: '2px 6px', borderRadius: '4px' }}>
                            受電 {c.call_count}回
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#7d68a8', marginTop: '2px' }}>
                          📞 {c.phone_number}
                        </div>
                        {c.frequent_notes && (
                          <div style={{ fontSize: '0.8rem', color: '#48564c', marginTop: '4px', background: '#f8f5ef', padding: '4px 8px', borderRadius: '4px' }}>
                            📝 {c.frequent_notes}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button 
                          className="btn-primary" 
                          style={{ fontSize: '0.75rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            onClose();
                            onOpenCallMemoForContact(c);
                          }}
                        >
                          <Phone size={12} /> 受電メモ作成
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px', display: 'flex' }}
                          onClick={() => handleStartEdit(c)}
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px', display: 'flex', color: '#d97a6c' }}
                          onClick={() => {
                            if (window.confirm(`「${c.company_name}」を削除してもよろしいですか？`)) {
                              onDeleteContact(c.id);
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
