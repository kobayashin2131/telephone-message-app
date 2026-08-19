import React, { useState, useEffect } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';
import CallMemoCard from './CallMemoCard';

export default function ThreadDrawer({ 
  parentMessage, onClose, currentUserId, onSendReply, onUpdateStatus 
}) {
  if (!parentMessage) return null;

  const [replies, setReplies] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchReplies = async () => {
    try {
      const res = await fetch(`https://callsync-backend.nonba30.workers.dev/api/messages/${parentMessage.id}/thread`);
      if (res.ok) {
        const data = await res.json();
        setReplies(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchReplies();
    const timer = setInterval(fetchReplies, 3000);
    return () => clearInterval(timer);
  }, [parentMessage.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    await onSendReply(parentMessage.id, text.trim());
    setText('');
    setLoading(false);
    fetchReplies();
  };

  return (
    <div className="thread-drawer">
      <div className="thread-header">
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#2d3830', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MessageSquare size={16} color="#7d68a8" />
          スレッド
        </div>
        <button className="btn-close" onClick={onClose}><X size={18} /></button>
      </div>

      <div className="thread-timeline">
        {/* Parent Box */}
        <div className="thread-parent-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div className="user-avatar-badge" style={{ width: '28px', height: '28px', fontSize: '0.75rem', backgroundColor: parentMessage.sender_avatar }}>
              {parentMessage.sender_name?.charAt(0)}
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{parentMessage.sender_name}</span>
            <span style={{ fontSize: '0.7rem', color: '#99a599' }}>
              {new Date(parentMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {parentMessage.message_type === 'call_card' ? (
            <CallMemoCard 
              memo={parentMessage}
              onUpdateStatus={onUpdateStatus}
              onOpenThread={() => {}}
              currentUserId={currentUserId}
            />
          ) : (
            <div style={{ fontSize: '0.9rem', color: '#4a5750', whiteSpace: 'pre-wrap' }}>
              {parentMessage.content}
            </div>
          )}
        </div>

        {/* Replies List */}
        <div style={{ fontSize: '0.75rem', color: '#66766c', fontWeight: 700, margin: '8px 0 4px' }}>
          返信 ({replies.length}件)
        </div>

        {replies.map(r => (
          <div key={r.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <div className="user-avatar-badge" style={{ width: '26px', height: '26px', fontSize: '0.7rem', backgroundColor: r.sender_avatar }}>
              {r.sender_name?.charAt(0)}
            </div>
            <div style={{ flex: 1, background: '#ffffff', border: '1px solid #e8e2d8', borderRadius: '8px', padding: '8px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#2d3830' }}>{r.sender_name}</span>
                <span style={{ fontSize: '0.7rem', color: '#99a599' }}>
                  {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#4a5750', whiteSpace: 'pre-wrap' }}>
                {r.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply Input */}
      <form onSubmit={handleSend} style={{ padding: '12px 16px', borderTop: '1px solid #e8e2d8', background: '#ffffff' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="スレッドに返信..." 
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ flex: 1, fontSize: '0.85rem' }}
          />
          <button type="submit" className="btn-send" style={{ padding: '6px 12px' }} disabled={loading}>
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
