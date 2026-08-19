import React, { useState, useEffect, useRef } from 'react';
import AppHeader from './components/AppHeader';
import ChatApp from './components/ChatApp';
import CallSyncApp from './components/CallSyncApp';
import NewGroupModal from './components/NewGroupModal';
import NewCallMemoModal from './components/NewCallMemoModal';
import ContactsDirectoryModal from './components/ContactsDirectoryModal';
import AdminModal from './components/AdminModal';
import LoginScreen from './components/LoginScreen';
import { playChime } from './utils/chime';
import { subscribeToPush, unsubscribeFromPush } from './utils/push';
import { loadAuth, saveAuth, clearAuth } from './utils/auth';
import './App.css';

const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';

export default function App() {
  const [auth, setAuth] = useState(() => loadAuth());

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [callMemos, setCallMemos] = useState([]);

  // Active top-level suite app: 'chat' | 'callsync'
  const [activeApp, setActiveApp] = useState('chat');

  const currentUserId = auth?.user?.id;
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogin = (data) => {
    saveAuth(data);
    setAuth(data);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth?.token}` }
      });
    } catch (e) {
      console.error('logout failed', e);
    }
    clearAuth();
    setAuth(null);
    setCurrentUser(null);
  };

  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeThread, setActiveThread] = useState(null);

  // Modals
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showNewCallMemoModal, setShowNewCallMemoModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [callMemoDefaultTarget, setCallMemoDefaultTarget] = useState(null);
  const [callMemoPrefillContact, setCallMemoPrefillContact] = useState(null);

  const openNewCallMemo = (opts = {}) => {
    setCallMemoDefaultTarget(opts.target || null);
    setCallMemoPrefillContact(opts.contact || null);
    setShowNewCallMemoModal(true);
  };

  // Chime + browser notification on new incoming calls
  const [notifyEnabled, setNotifyEnabled] = useState(() => localStorage.getItem('callsync_notify') === '1');
  const seenPendingIdsRef = useRef(null); // null = not yet initialized (skip first load)

  const onToggleNotify = async () => {
    if (!notifyEnabled) {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      playChime(); // unlocks audio playback with this user gesture
      try {
        await subscribeToPush(currentUserId); // タブを閉じていても届くPush通知
      } catch (e) {
        console.error('push subscribe failed', e);
      }
      setNotifyEnabled(true);
      localStorage.setItem('callsync_notify', '1');
    } else {
      try {
        await unsubscribeFromPush();
      } catch (e) {
        console.error('push unsubscribe failed', e);
      }
      setNotifyEnabled(false);
      localStorage.setItem('callsync_notify', '0');
    }
  };

  const notifyNewCalls = (memos) => {
    const pending = memos.filter(m => m.status === 'pending');
    const pendingIds = new Set(pending.map(m => m.id));

    if (seenPendingIdsRef.current === null) {
      seenPendingIdsRef.current = pendingIds;
      return;
    }

    const newOnes = pending.filter(m => !seenPendingIdsRef.current.has(m.id) && m.created_by !== currentUserId);
    seenPendingIdsRef.current = pendingIds;

    if (newOnes.length === 0 || !notifyEnabled) return;

    playChime();
    if ('Notification' in window && Notification.permission === 'granted') {
      newOnes.forEach(m => {
        new Notification(`📞 ${m.company_name} より受電`, {
          body: m.contact_person ? `${m.contact_person} 様` : (m.subject || '内容を確認してください'),
          tag: `call-memo-${m.id}`
        });
      });
    }
  };

  const fetchAllData = async () => {
    if (!auth) return;
    const orgId = auth.user.organization_id;
    try {
      const [uRes, dRes, gRes, cRes, mRes] = await Promise.all([
        fetch(`${API_BASE}/users?organization_id=${orgId}`),
        fetch(`${API_BASE}/departments?organization_id=${orgId}`),
        fetch(`${API_BASE}/groups?organization_id=${orgId}`),
        fetch(`${API_BASE}/contacts?organization_id=${orgId}`),
        fetch(`${API_BASE}/call-memos?organization_id=${orgId}`)
      ]);
      if (uRes.ok) setUsers(await uRes.json());
      if (dRes.ok) setDepartments(await dRes.json());
      if (gRes.ok) setGroups(await gRes.json());
      if (cRes.ok) setContacts(await cRes.json());
      if (mRes.ok) {
        const memos = await mRes.json();
        notifyNewCalls(memos);
        setCallMemos(memos);
      }
    } catch (e) {
      console.error('Error fetching initial data', e);
    }
  };

  useEffect(() => {
    if (!auth) return;
    fetchAllData();
    const timer = setInterval(fetchAllData, 3000);
    return () => clearInterval(timer);
  }, [auth, notifyEnabled]);

  useEffect(() => {
    if (users.length > 0) {
      const found = users.find(u => u.id === currentUserId) || users[0];
      setCurrentUser(found);
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
        body: JSON.stringify({ ...groupData, organization_id: auth.user.organization_id })
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
        body: JSON.stringify({ ...memoData, organization_id: auth.user.organization_id })
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
          resolved_note: resolvedNote,
          organization_id: auth.user.organization_id
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
    const orgId = auth.user.organization_id;
    try {
      if (contact.id) {
        await fetch(`${API_BASE}/contacts/${contact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...contact, organization_id: orgId })
        });
      } else {
        await fetch(`${API_BASE}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...contact, organization_id: orgId })
        });
      }
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteContact = async (id) => {
    try {
      await fetch(`${API_BASE}/contacts/${id}?organization_id=${auth.user.organization_id}`, { method: 'DELETE' });
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveUser = async (u) => {
    const orgId = auth.user.organization_id;
    try {
      if (u.id) {
        await fetch(`${API_BASE}/users/${u.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...u, organization_id: orgId })
        });
      } else {
        await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...u, organization_id: orgId })
        });
      }
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await fetch(`${API_BASE}/users/${id}?organization_id=${auth.user.organization_id}`, { method: 'DELETE' });
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveDept = async (d) => {
    const orgId = auth.user.organization_id;
    try {
      if (d.id) {
        await fetch(`${API_BASE}/departments/${d.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...d, organization_id: orgId })
        });
      } else {
        await fetch(`${API_BASE}/departments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...d, organization_id: orgId })
        });
      }
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDept = async (id) => {
    try {
      await fetch(`${API_BASE}/departments/${id}?organization_id=${auth.user.organization_id}`, { method: 'DELETE' });
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const unhandledCallsCount = callMemos.filter(m => m.status === 'pending').length;

  if (!auth) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="suite-root">
      {/* 1. Global Suite Header (App Switcher & Account) */}
      <AppHeader
        activeApp={activeApp}
        onChangeApp={setActiveApp}
        currentUser={currentUser}
        users={users}
        onLogout={handleLogout}
        onOpenNewCallMemo={() => openNewCallMemo()}
        onOpenContacts={() => setShowContactsModal(true)}
        onOpenAdmin={() => setShowAdminModal(true)}
        callMemosCount={{ unhandled: unhandledCallsCount, total: callMemos.length }}
        notifyEnabled={notifyEnabled}
        onToggleNotify={onToggleNotify}
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
            onOpenNewCallMemo={(target) => openNewCallMemo({ target })}
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
            onOpenNewCallMemo={() => openNewCallMemo()}
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
          currentUserId={currentUserId}
          defaultTarget={callMemoDefaultTarget}
          prefillContact={callMemoPrefillContact}
          onClose={() => setShowNewCallMemoModal(false)}
          onSubmitCallMemo={handleSubmitCallMemo}
        />
      )}

      {showNewGroupModal && (
        <NewGroupModal
          users={users}
          departments={departments}
          currentUserId={currentUserId}
          onClose={() => setShowNewGroupModal(false)}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {showContactsModal && (
        <ContactsDirectoryModal
          contacts={contacts}
          onClose={() => setShowContactsModal(false)}
          onSaveContact={handleSaveContact}
          onDeleteContact={handleDeleteContact}
          onOpenCallMemoForContact={(contact) => {
            setShowContactsModal(false);
            openNewCallMemo({ contact });
          }}
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
