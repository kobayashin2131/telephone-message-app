import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Phone, Users, Building2, MessageSquare, Check, Eye, Smile, Paperclip, Search, PlusCircle, ArrowLeft, FileText, X, Loader2, AtSign
} from 'lucide-react';
import CallMemoCard from './CallMemoCard';
import { uploadAttachment, ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_SIZE } from '../utils/upload';
import { formatTime } from '../utils/datetime';

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function hasMentionToMe(content, currentUserName) {
  if (!content || !currentUserName) return false;
  const normalized = content.replace(/＠/g, '@');
  return normalized.includes('@全員') || normalized.includes('@all') || normalized.includes(`@${currentUserName}`);
}

function renderContentWithMentions(content, currentUserName) {
  if (!content) return null;
  const regex = /([@＠][^\s@＠　]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }
    const rawMention = match[1];
    const name = rawMention.slice(1);
    const isMe = name === '全員' || name === 'all' || name === currentUserName;
    parts.push(
      <span key={match.index} className={`mention-pill ${isMe ? 'is-me' : ''}`}>
        @{name}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  return parts;
}

export default function ChatArea({
  activeChat, currentUser, users = [], messages, organizationId, onSendMessage, onUpdateStatus, onOpenThread, onOpenNewCallMemo, onBack
}) {
  const [text, setText] = useState('');
  const [activeReadersPopover, setActiveReadersPopover] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
  const [sending, setSending] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  const [showMentionSuggest, setShowMentionSuggest] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionCursorPos, setMentionCursorPos] = useState(0);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const timelineEndRef = useRef(null);

  const scrollToBottom = () => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const clearPendingFile = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
  };

  const candidateUsers = [
    { id: 'all', name: '全員', isAll: true, department_name: 'チャンネル参加者全員' },
    ...users.filter(u => u.id !== currentUser?.id)
  ];

  const filteredCandidates = candidateUsers.filter(u => 
    u.name.toLowerCase().includes(mentionFilter.toLowerCase()) ||
    (u.department_name && u.department_name.toLowerCase().includes(mentionFilter.toLowerCase()))
  );

  const handleTextChange = (e) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setText(val);
    setMentionCursorPos(pos);

    const textBeforeCursor = val.slice(0, pos);
    const atMatch = textBeforeCursor.match(/[@＠]([^\s@＠　]*)$/);

    if (atMatch) {
      setMentionFilter(atMatch[1]);
      setShowMentionSuggest(true);
      return;
    }
    setShowMentionSuggest(false);
  };

  const insertMention = (user) => {
    const textBeforeCursor = text.slice(0, mentionCursorPos);
    const atMatch = textBeforeCursor.match(/[@＠][^\s@＠　]*$/);
    const textAfterCursor = text.slice(mentionCursorPos);

    const prefix = atMatch ? textBeforeCursor.slice(0, atMatch.index) : textBeforeCursor;
    const mentionString = `@${user.name} `;
    const newText = prefix + mentionString + textAfterCursor;

    setText(newText);
    setShowMentionSuggest(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextPos = (prefix + mentionString).length;
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 0);
  };

  const handleOpenMentionPicker = () => {
    if (showMentionSuggest) {
      setShowMentionSuggest(false);
      return;
    }
    const pos = textareaRef.current?.selectionStart ?? text.length;
    setMentionCursorPos(pos);
    setMentionFilter('');
    setShowMentionSuggest(true);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!text.trim() && !pendingFile) return;
    setShowMentionSuggest(false);

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
    if (showMentionSuggest && (e.key === 'Escape')) {
      setShowMentionSuggest(false);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (showMentionSuggest && filteredCandidates.length > 0) {
        e.preventDefault();
        insertMention(filteredCandidates[0]);
        return;
      }
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
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
            const isMentionedToMe = !isMe && hasMentionToMe(m.content, currentUser?.name);

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
              <div key={m.id} className={`message-item ${isMentionedToMe ? 'mentioned-me' : ''}`}>
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
                    {isMentionedToMe && <span className="mention-to-me-badge">あなた宛て</span>}
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
                      {m.content && <div className="message-text" style={{ marginTop: '6px' }}>{renderContentWithMentions(m.content, currentUser?.name)}</div>}
                    </div>
                  ) : (
                    <div className="message-text">
                      {renderContentWithMentions(m.content, currentUser?.name)}
                    </div>
                  )}

                  <div className="message-meta-footer">
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

      <div className="chat-input-bar">
        {uploadError && (
          <div className="attachment-error-banner">
            <span>{uploadError}</span>
            <button type="button" onClick={() => setUploadError('')}><X size={13} /></button>
          </div>
        )}

        {showMentionSuggest && (
          <div className="mention-suggest-popover">
            <div className="mention-suggest-header">
              <span>メンバーをメンション (@)</span>
              <button type="button" onClick={() => setShowMentionSuggest(false)}><X size={12} /></button>
            </div>
            <div className="mention-suggest-list">
              {filteredCandidates.length === 0 ? (
                <div className="mention-suggest-empty">該当するメンバーが見つかりません</div>
              ) : (
                filteredCandidates.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className="mention-suggest-item"
                    onClick={() => insertMention(c)}
                  >
                    <div 
                      className="mention-suggest-avatar" 
                      style={{ backgroundColor: c.isAll ? '#4f46e5' : (c.avatar_color || '#9b84c4') }}
                    >
                      {c.isAll ? '📢' : c.name.charAt(0)}
                    </div>
                    <div className="mention-suggest-info">
                      <span className="mention-suggest-name">@{c.name}</span>
                      <span className="mention-suggest-dept">{c.department_name || (c.isAll ? '全員' : '一般')}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
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
              ref={textareaRef}
              className="chat-textarea"
              placeholder={pendingFile ? '添付にひとことメッセージを添える(空欄でも送信できます)' : `${activeChat.name} へメッセージを送信... (@でメンバー指名, Enterで送信)`}
              value={text}
              onChange={handleTextChange}
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
                <button
                  type="button"
                  className="btn-tool btn-mention"
                  onClick={handleOpenMentionPicker}
                  disabled={sending}
                  title="@メンションを挿入"
                >
                  <AtSign size={20} />
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
