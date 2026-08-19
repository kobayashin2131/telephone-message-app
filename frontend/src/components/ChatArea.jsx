import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Phone, Users, Building2, MessageSquare, Check, Eye, Smile, Paperclip, Search, PlusCircle, ArrowLeft
} from 'lucide-react';
import CallMemoCard from './CallMemoCard';

const EMOJIS = ['👍', '🙌', '🙏', '🙇', '❤️', '🔥', '✅', '👀'];

export default function ChatArea({
  activeChat, currentUser, messages, onSendMessage, onUpdateStatus, onOpenThread, onOpenNewCallMemo, onBack
}) {
  const [text, setText] = useState('');
  const [activeReadersPopover, setActiveReadersPopover] = useState(null);
  const timelineEndRef = useRef(null);

  const scrollToBottom = () => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
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
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {isCallCard ? (
                    <CallMemoCard 
                      memo={m}
                      onUpdateStatus={onUpdateStatus}
                      onOpenThread={onOpenThread}
                      currentUserId={currentUser?.id}
                    />
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
                                  {new Date(r.read_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        <form onSubmit={handleSend}>
          <div className="input-box-wrapper">
            <textarea 
              className="chat-textarea"
              placeholder={`${activeChat.name} へメッセージを送信... (Enterで送信, Shift+Enterで改行)`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows="2"
            />
            <div className="input-toolbar">
              <div className="toolbar-left">
                {EMOJIS.slice(0, 5).map(emoji => (
                  <button 
                    key={emoji}
                    type="button" 
                    className="btn-tool"
                    style={{ fontSize: '1rem', padding: '2px 4px' }}
                    onClick={() => setText(prev => prev + emoji)}
                  >
                    {emoji}
                  </button>
                ))}
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
                <button type="submit" className="btn-send" disabled={!text.trim()}>
                  <Send size={14} /> 送信
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
