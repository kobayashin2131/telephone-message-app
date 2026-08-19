import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Phone, Users, Building2, MessageSquare, Check, Eye, Smile, Paperclip, Search, PlusCircle, ArrowLeft, FileText, X, Loader2
} from 'lucide-react';
import CallMemoCard from './CallMemoCard';
import { uploadAttachment, ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_SIZE } from '../utils/upload';
import { formatTime } from '../utils/datetime';

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function ChatArea({
  activeChat, currentUser, messages, organizationId, onSendMessage, onUpdateStatus, onOpenThread, onOpenNewCallMemo, onBack
}) {
  const [text, setText] = useState('');
  const [activeReadersPopover, setActiveReadersPopover] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
  const [sending, setSending] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);
  const timelineEndRef = useRef(null);

  const scrollToBottom = () => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // プレビュー用のBlob URLはコンポーネントが破棄・差し替えられる際に解放する
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const clearPendingFile = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && !pendingFile) return;

    if (pendingFile) {
      setUploadError('');
      setSending(true);
      try {
        const uploaded = await uploadAttachment(pendingFile, organizationId);
        onSendMessage(text.trim(), uploaded);
        setText('');
        clearPendingFile();
      } catch (err) {
        setUploadError(err.message);
      } finally {
        setSending(false);
      }
      return;
    }

    onSendMessage(text.trim());
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 同じファイルを連続で選んでもonChangeが発火するように
    if (!file) return;

    setUploadError('');
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      setUploadError('画像またはPDFのみ添付できます');
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setUploadError('ファイルサイズは15MBまでです');
      return;
    }

    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(file);
    setPendingPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  if (!activeChat) {
    return (
      <div className="main-chat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5e6b60' }}>
        左側のリストからチャットまたはグループを選択してください
      </div>
    );
  }

  return (
    <div className="main-chat" onClick={() => setActiveReadersPopover(null)}>
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <button className="btn-back-mobile" onClick={onBack} aria-label="チャット一覧に戻る">
            <ArrowLeft size={18} />
          </button>
          <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{activeChat.icon || '💬'}</span>
          <div style={{ minWidth: 0 }}>
            <div className="chat-header-title">
              <span className="chat-header-title-text">{activeChat.name}</span>
              {activeChat.memberCount !== undefined && (
                <span style={{ flexShrink: 0, fontSize: '0.75rem', background: '#f7f3fb', color: '#7d68a8', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  {activeChat.memberCount}名参加
                </span>
              )}
            </div>
            {activeChat.description && (
              <div className="chat-header-desc">{activeChat.description}</div>
            )}
          </div>
        </div>

        <div className="chat-header-actions">
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', borderColor: '#ddd0ee', color: '#6b5590', background: '#f7f3fb' }}
            onClick={() => onOpenNewCallMemo(activeChat)}
          >
            <Phone size={14} /> <span className="btn-label-desktop">このチャットに受電メモ投稿</span>
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="chat-timeline">
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5e6b60' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💬</div>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: '#4a5750' }}>まだメッセージはありません</div>
            <div style={{ fontSize: '0.85rem' }}>最初のメッセージや受電メモを投稿してみましょう！</div>
          </div>
        ) : (
          messages.map(m => {
            const isMe = m.sender_id === currentUser?.id;
            const isSystem = m.message_type === 'system';
            const isCallCard = m.message_type === 'call_card';

            if (isSystem) {
              return (
                <div key={m.id} style={{ textAlign: 'center', margin: '8px 0' }}>
                  <span style={{ background: '#e8e2d8', color: '#4a5750', fontSize: '0.75rem', padding: '3px 12px', borderRadius: '12px' }}>
                    {m.content}
                  </span>
                </div>
              );
            }

            return (
              <div key={m.id} className="message-item">
                <div 
                  className="message-avatar" 
                  style={{ backgroundColor: m.sender_avatar || '#9b84c4' }}
                >
                  {m.sender_name?.charAt(0)}
                </div>

                <div className="message-body">
                  <div className="message-header">
                    <span className="message-sender">{m.sender_name}</span>
                    {m.sender_role === 'admin' && <span className="message-role-tag">管理者</span>}
                    <span className="message-time">
                      {formatTime(m.created_at)}
                    </span>
                  </div>

                  {isCallCard ? (
                    <CallMemoCard
                      memo={m}
                      onUpdateStatus={onUpdateStatus}
                      onOpenThread={onOpenThread}
                      currentUserId={currentUser?.id}
                    />
                  ) : m.attachment_url ? (
                    <div className="message-attachment">
                      {m.message_type === 'image' ? (
                        <a href={m.attachment_url} target="_blank" rel="noopener noreferrer">
                          <img src={m.attachment_url} alt={m.attachment_name || '添付画像'} className="attachment-image" />
                        </a>
                      ) : (
                        <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="attachment-file-chip">
                          <FileText size={20} />
                          <div className="attachment-file-info">
                            <div className="attachment-file-name">{m.attachment_name || 'ファイル'}</div>
                            <div className="attachment-file-size">{formatFileSize(m.attachment_size)}</div>
                          </div>
                        </a>
                      )}
                      {m.content && <div className="message-text" style={{ marginTop: '6px' }}>{m.content}</div>}
                    </div>
                  ) : (
                    <div className="message-text">
                      {m.content}
                    </div>
                  )}

                  {/* Message Meta Footer: Read Receipts & Thread Link */}
                  <div className="message-meta-footer">
                    {/* Read Receipts indicator */}
                    {activeChat.type === 'dm' ? (
                      <span className="read-indicator">
                        {m.read_count > 1 ? '✓ 既読' : '未読'}
                      </span>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <span 
                          className="read-indicator"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveReadersPopover(activeReadersPopover === m.id ? null : m.id);
                          }}
                        >
                          <Eye size={12} /> 既読 {m.read_count}人
                        </span>

                        {/* Readers list Popover */}
                        {activeReadersPopover === m.id && (
                          <div style={{
                            position: 'absolute', bottom: '100%', left: 0, zIndex: 60,
                            background: '#38443c', color: '#fff', padding: '8px 12px', borderRadius: '6px',
                            fontSize: '0.75rem', minWidth: '160px', boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
                          }}>
                            <div style={{ fontWeight: 700, marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2px' }}>
                              既読メンバー ({m.readers?.length || 0})
                            </div>
                            {m.readers?.map(r => (
                              <div key={r.user_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                <span>{r.name}</span>
                                <span style={{ color: '#5e6b60' }}>
                                  {formatTime(r.read_at)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Thread link for regular message */}
                    {!isCallCard && (
                      <button className="thread-link-btn" onClick={() => onOpenThread(m)}>
                        <MessageSquare size={13} />
                        {m.thread_count > 0 ? `返信 (${m.thread_count})` : '返信'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={timelineEndRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar">
        {uploadError && (
          <div className="attachment-error-banner">
            <span>{uploadError}</span>
            <button type="button" onClick={() => setUploadError('')}><X size={13} /></button>
          </div>
        )}
        <form onSubmit={handleSend}>
          <div className="input-box-wrapper">
            {pendingFile && (
              <div className="pending-attachment-chip">
                {pendingPreviewUrl ? (
                  <img src={pendingPreviewUrl} alt={pendingFile.name} className="pending-attachment-thumb" />
                ) : (
                  <FileText size={18} />
                )}
                <span className="pending-attachment-name">{pendingFile.name}</span>
                <button type="button" onClick={clearPendingFile} disabled={sending} title="添付を取り消す">
                  <X size={14} />
                </button>
              </div>
            )}
            <textarea
              className="chat-textarea"
              placeholder={pendingFile ? '添付にひとことメッセージを添える(空欄でも送信できます)' : `${activeChat.name} へメッセージを送信... (Enterで送信, Shift+Enterで改行)`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows="2"
            />
            <div className="input-toolbar">
              <div className="toolbar-left">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept={ALLOWED_ATTACHMENT_TYPES.join(',')}
                  style={{ display: 'none' }}
                  onChange={handleFileSelected}
                />
                <button
                  type="button"
                  className="btn-tool btn-attach"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  title="画像・PDFを添付"
                >
                  <Paperclip size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => onOpenNewCallMemo(activeChat)}
                >
                  <Phone size={12} color="#7d68a8" /> 受電メモ
                </button>
                <button type="submit" className="btn-send" disabled={sending || (!text.trim() && !pendingFile)}>
                  {sending ? <Loader2 size={14} className="spin-icon" /> : <Send size={14} />}
                  {sending ? '送信中…' : '送信'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
