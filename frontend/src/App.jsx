import React, { useState, useEffect } from 'react';
import AppHeader from './components/AppHeader';
import ChatApp from './components/ChatApp';
import CallSyncApp from './components/CallSyncApp';
import NewGroupModal from './components/NewGroupModal';
import NewCallMemoModal from './components/NewCallMemoModal';
import ContactsDirectoryModal from './components/ContactsDirectoryModal';
import AdminModal from './components/AdminModal';
import './App.css';

const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';

export default function App() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [callMemos, setCallMemos] = useState([]);

  // Active top-level suite app: 'chat' | 'callsync'
  const [activeApp, setActiveApp] = useState('chat');

  const [currentUserId, setCurrentUserId] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);

  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeThread, setActiveThread] = useState(null);

  // Modals
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showNewCallMemoModal, setShowNewCallMemoModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const fetchAllData = async () => {
    try {
      const [uRes, dRes, gRes, cRes, mRes] = await Promise.all([
        fetch(`${API_BASE}/users`),
        fetch(`${API_BASE}/departments`),
        fetch(`${API_BASE}/groups`),
        fetch(`${API_BASE}/contacts`),
        fetch(`${API_BASE}/call-memos`)
      ]);
      if (uRes.ok) setUsers(await uRes.json());
      if (dRes.ok) setDepartments(await dRes.json());
      if (gRes.ok) setGroups(await gRes.json());
      if (cRes.ok) setContacts(await cRes.json());
      if (mRes.ok) setCallMemos(await mRes.json());
    } catch (e) {
      console.error('Error fetching initial data', e);
    }
  };

  useEffect(() => {
    fetchAllData();
    const timer = setInterval(fetchAllData, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      const found = users.find(u => u.id === currentUserId) || users[0];
      setCurrentUser(found);
      if (!activeChat && groups.length > 0) {
        setActiveChat({
          type: 'group',
          id: groups[0].id,
          name: groups[0].name,
          icon: groups[0].icon,
          memberCount: groups[0].member_count,
          description: groups[0].description
        });
      }
    }
  }, [users, currentUserId]);

  const fetchMessages = async () => {
    if (!activeChat || !currentUserId) return;
    try {
      const res = await fetch(`${API_BASE}/messages?target_type=${activeChat.type}&target_id=${activeChat.id}&current_user_id=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);

        const unreadIds = data.filter(m => !m.is_read_by_me).map(m => m.id);
        if (unreadIds.length > 0) {
          fetch(`${API_BASE}/messages/mark-read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_ids: unreadIds, user_id: currentUserId })
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [activeChat, currentUserId]);

  const handleSendMessage = async (content) => {
    if (!activeChat || !content.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: activeChat.type,
          target_id: activeChat.id,
          sender_id: currentUserId,
          content: content.trim(),
          message_type: 'text'
        })
      });
      if (res.ok) fetchMessages();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendThreadReply = async (parentId, content) => {
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: activeChat?.type || 'group',
          target_id: activeChat?.id || 1,
          sender_id: currentUserId,
          content: content.trim(),
          message_type: 'text',
          parent_id: parentId
        })
      });
      if (res.ok) fetchMessages();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateGroup = async (groupData) => {
    try {
      const res = await fetch(`${API_BASE}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData)
      });
      if (res.ok) {
        const newG = await res.json();
        await fetchAllData();
        setActiveChat({
          type: 'group',
          id: newG.id,
          name: newG.name,
          icon: newG.icon,
          memberCount: newG.member_count,
          description: newG.description
        });
        setActiveApp('chat');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitCallMemo = async (memoData) => {
    try {
      const res = await fetch(`${API_BASE}/call-memos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memoData)
      });
      if (res.ok) {
        fetchAllData();
        fetchMessages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCallStatus = async (memoId, status, resolvedNote = '') => {
    try {
      const res = await fetch(`${API_BASE}/call-memos/${memoId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          resolved_by: currentUserId,
          resolved_note: resolvedNote
        })
      });
      if (res.ok) {
        fetchAllData();
        fetchMessages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveContact = async (contact) => {
    try {
      if (contact.id) {
        await fetch(`${API_BASE}/contacts/${contact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact)
        });
      } else {
        await fetch(`${API_BASE}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact)
        });
      }
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteContact = async (id) => {
    try {
      await fetch(`${API_BASE}/contacts/${id}`, { method: 'DELETE' });
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveUser = async (u) => {
    try {
      if (u.id) {
        await fetch(`${API_BASE}/users/${u.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(u)
        });
      } else {
        await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(u)
        });
      }
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveDept = async (d) => {
    try {
      if (d.id) {
        await fetch(`${API_BASE}/departments/${d.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(d)
        });
      } else {
        await fetch(`${API_BASE}/departments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(d)
        });
      }
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDept = async (id) => {
    try {
      await fetch(`${API_BASE}/departments/${id}`, { method: 'DELETE' });
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const unhandledCallsCount = callMemos.filter(m => m.status === 'unhandled').length;

  return (
    <div className="suite-root">
      {/* 1. Global Suite Header (App Switcher & Account) */}
      <AppHeader 
        activeApp={activeApp}
        onChangeApp={setActiveApp}
        currentUser={currentUser}
        users={users}
        onSwitchUser={setCurrentUserId}
        onOpenNewCallMemo={() => setShowNewCallMemoModal(true)}
        onOpenContacts={() => setShowContactsModal(true)}
        onOpenAdmin={() => setShowAdminModal(true)}
        callMemosCount={{ unhandled: unhandledCallsCount, total: callMemos.length }}
      />

      {/* 2. Main App Content (Chat or CallSync) */}
      <div className="suite-app-body">
        {activeApp === 'chat' && (
          <ChatApp 
            currentUser={currentUser}
            users={users}
            groups={groups}
            activeChat={activeChat}
            onSelectChat={setActiveChat}
            messages={messages}
            onSendMessage={handleSendMessage}
            onUpdateStatus={handleUpdateCallStatus}
            onOpenNewGroup={() => setShowNewGroupModal(true)}
            onOpenNewCallMemo={() => setShowNewCallMemoModal(true)}
            activeThread={activeThread}
            onOpenThread={(msg) => setActiveThread(msg)}
            onCloseThread={() => setActiveThread(null)}
            onSendThreadReply={handleSendThreadReply}
          />
        )}

        {activeApp === 'callsync' && (
          <CallSyncApp 
            callMemos={callMemos}
            users={users}
            departments={departments}
            groups={groups}
            contacts={contacts}
            currentUser={currentUser}
            onSubmitCallMemo={handleSubmitCallMemo}
            onUpdateStatus={handleUpdateCallStatus}
            onOpenThread={(msg) => {
              setActiveThread(msg);
              setActiveApp('chat');
            }}
            onOpenNewCallMemo={() => setShowNewCallMemoModal(true)}
            onOpenContacts={() => setShowContactsModal(true)}
          />
        )}
      </div>

      {/* 3. Global Shared Modals */}
      {showNewCallMemoModal && (
        <NewCallMemoModal 
          users={users}
          departments={departments}
          groups={groups}
          contacts={contacts}
          currentUser={currentUser}
          onClose={() => setShowNewCallMemoModal(false)}
          onSubmit={handleSubmitCallMemo}
        />
      )}

      {showNewGroupModal && (
        <NewGroupModal 
          users={users}
          departments={departments}
          currentUser={currentUser}
          onClose={() => setShowNewGroupModal(false)}
          onSubmit={handleCreateGroup}
        />
      )}

      {showContactsModal && (
        <ContactsDirectoryModal 
          contacts={contacts}
          onClose={() => setShowContactsModal(false)}
          onSave={handleSaveContact}
          onDelete={handleDeleteContact}
        />
      )}

      {showAdminModal && (
        <AdminModal 
          users={users}
          departments={departments}
          groups={groups}
          currentUser={currentUser}
          onClose={() => setShowAdminModal(false)}
          onSaveUser={handleSaveUser}
          onDeleteUser={handleDeleteUser}
          onSaveDept={handleSaveDept}
          onDeleteDept={handleDeleteDept}
        />
      )}
    </div>
  );
}
