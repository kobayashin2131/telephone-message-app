import React, { useState, useEffect, useRef } from 'react';
import AppHeader from './components/AppHeader';
import ChatApp from './components/ChatApp';
import CallSyncApp from './components/CallSyncApp';
import NewGroupModal from './components/NewGroupModal';
import NewCallMemoModal from './components/NewCallMemoModal';
import ContactsDirectoryModal from './components/ContactsDirectoryModal';
import AdminModal from './components/AdminModal';
import ChangePinModal from './components/ChangePinModal';
import CsvImportModal from './components/CsvImportModal';
import LoginScreen from './components/LoginScreen';
import SignupScreen from './components/SignupScreen';
import { playChime } from './utils/chime';
import { subscribeToPush, unsubscribeFromPush } from './utils/push';
import { isNativeApp, setupNativePush } from './utils/nativePush';
import { loadAuth, saveAuth, clearAuth } from './utils/auth';
import './App.css';

const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';

export default function App() {
  const [auth, setAuth] = useState(() => loadAuth());
  const [authScreen, setAuthScreen] = useState('login'); // 'login' | 'signup'

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
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [callMemoDefaultTarget, setCallMemoDefaultTarget] = useState(null);
  const [callMemoPrefillContact, setCallMemoPrefillContact] = useState(null);

  const openNewCallMemo = (opts = {}) => {
    setCallMemoDefaultTarget(opts.target || null);
    setCallMemoPrefillContact(opts.contact || null);
    setShowNewCallMemoModal(true);
  };

  // Chime + browser notification on new incoming calls & messages
  // スマホでは通知が無いと実用にならないため、明示的にOFFにされていない限りデフォルトON
  const [notifyEnabled, setNotifyEnabled] = useState(() => localStorage.getItem('callsync_notify') !== '0');
  const seenPendingIdsRef = useRef(null); // null = not yet initialized (skip first load)
  const seenUnreadMsgIdsRef = useRef(null);
  const hasRequestedNotifyRef = useRef(false);

  // Unread summary for chat
  const [unreadSummary, setUnreadSummary] = useState({ total_unread: 0, by_target: {} });

  // デフォルトONの場合、初回ログイン後に自動で通知許可をリクエストする
  // ネイティブアプリ内ではFCM(ネイティブPush)、Web版ではブラウザのWeb Pushを使う
  useEffect(() => {
    if (!auth || !notifyEnabled || hasRequestedNotifyRef.current) return;
    const orgId = auth?.user?.organization_id;

    if (isNativeApp()) {
      hasRequestedNotifyRef.current = true;
      setupNativePush(currentUserId).catch((e) => {
        console.error('native push setup failed', e);
        if (e?.code === 'PERMISSION_DENIED') alert(e.message);
      });
      return;
    }

    if (!('Notification' in window) || Notification.permission !== 'default') return;
    hasRequestedNotifyRef.current = true;

    (async () => {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      try {
        await subscribeToPush(currentUserId, orgId);
      } catch (e) {
        console.error('push subscribe failed', e);
      }
    })();
  }, [auth, currentUserId, notifyEnabled]);

  const onToggleNotify = async () => {
    const orgId = auth?.user?.organization_id;
    if (!notifyEnabled) {
      if (isNativeApp()) {
        try {
          await setupNativePush(currentUserId);
        } catch (e) {
          console.error('native push setup failed', e);
          alert(e?.message || '通知の設定に失敗しました。もう一度お試しください。');
          return;
        }
      } else {
        if (!('Notification' in window) || !('PushManager' in window)) {
          alert('お使いのブラウザは通知に対応していません。');
          return;
        }
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        if (Notification.permission === 'denied') {
          alert(
            '通知がブロックされています。ブラウザのアドレスバー左側のアイコンから'
            + '「サイトの設定」→「通知」を「許可」に変更してから、もう一度お試しください。'
          );
          return;
        }
        try {
          await subscribeToPush(currentUserId, orgId); // タブを閉じていても届くPush通知
        } catch (e) {
          console.error('push subscribe failed', e);
          alert('通知の設定に失敗しました。もう一度お試しください。');
          return;
        }
      }
      playChime(); // unlocks audio playback with this user gesture
      setNotifyEnabled(true);
      localStorage.setItem('callsync_notify', '1');
    } else {
      if (!isNativeApp()) {
        try {
          await unsubscribeFromPush();
        } catch (e) {
          console.error('push unsubscribe failed', e);
        }
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

  const notifyNewMessages = (unreadItems) => {
    const unreadIds = new Set((unreadItems || []).map(m => m.id));

    if (seenUnreadMsgIdsRef.current === null) {
      seenUnreadMsgIdsRef.current = unreadIds;
      return;
    }

    const newOnes = (unreadItems || []).filter(m => !seenUnreadMsgIdsRef.current.has(m.id) && m.sender_id !== currentUserId);
    seenUnreadMsgIdsRef.current = unreadIds;

    if (newOnes.length === 0 || !notifyEnabled) return;

    playChime();
    if ('Notification' in window && Notification.permission === 'granted') {
      newOnes.forEach(m => {
        const title = m.target_type === 'dm' ? `💬 ${m.sender_name} さんより` : `💬 新着メッセージ (${m.sender_name})`;
        new Notification(title, {
          body: m.content || (m.message_type === 'image' ? '📷 画像を送信しました' : '📎 ファイルを送信しました'),
          tag: `chat-${m.target_type}-${m.target_id}`,
          data: {
            type: 'message',
            targetType: m.target_type,
            targetId: m.target_id
          }
        });
      });
    }
  };

  const handleNavigateTarget = (targetType, targetId) => {
    setActiveApp('chat');
    const tid = Number(targetId);
    if (targetType === 'group') {
      const g = groups.find(x => x.id === tid);
      if (g) {
        setActiveChat({
          type: 'group',
          id: g.id,
          name: g.name,
          icon: g.icon,
          memberCount: g.member_count,
          description: g.description
        });
      }
    } else if (targetType === 'dm' || targetType === 'user') {
      const u = users.find(x => x.id === tid);
      if (u) {
        setActiveChat({
          type: 'dm',
          id: u.id,
          name: u.name,
          icon: '👤',
          avatarColor: u.avatar_color,
          department: u.department_name
        });
      }
    }
  };

  // Deep link listener from Service Worker
  useEffect(() => {
    const onSwMessage = (e) => {
      if (e.data?.type === 'NAVIGATE_TARGET') {
        const d = e.data.data || {};
        if (d.targetType && d.targetId) {
          handleNavigateTarget(d.targetType, d.targetId);
        } else if (e.data.url?.includes('app=callsync')) {
          setActiveApp('callsync');
        } else {
          setActiveApp('chat');
        }
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
      return () => navigator.serviceWorker.removeEventListener('message', onSwMessage);
    }
  }, [users, groups]);

  // Deep link check from initial URL
  useEffect(() => {
    if (users.length === 0 && groups.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const app = params.get('app');
    const targetType = params.get('target_type');
    const targetId = params.get('target_id');
    if (app === 'callsync') {
      setActiveApp('callsync');
    } else if (app === 'chat' && targetType && targetId) {
      handleNavigateTarget(targetType, targetId);
    }
  }, [users, groups]);

  const fetchAllData = async () => {
    if (!auth) return;
    const orgId = auth.user.organization_id;
    try {
      const [uRes, dRes, gRes, cRes, mRes, unreadRes] = await Promise.all([
        fetch(`${API_BASE}/users?organization_id=${orgId}`),
        fetch(`${API_BASE}/departments?organization_id=${orgId}`),
        fetch(`${API_BASE}/groups?organization_id=${orgId}`),
        fetch(`${API_BASE}/contacts?organization_id=${orgId}`),
        fetch(`${API_BASE}/call-memos?organization_id=${orgId}`),
        fetch(`${API_BASE}/messages/unread-summary?user_id=${currentUserId}`)
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
      if (unreadRes.ok) {
        const summary = await unreadRes.json();
        notifyNewMessages(summary.unread_items);
        setUnreadSummary({
          total_unread: summary.total_unread || 0,
          by_target: summary.by_target || {}
        });
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

  const handleSendMessage = async (content, attachment = null) => {
    if (!activeChat || (!content.trim() && !attachment)) return;
    try {
      const messageType = attachment
        ? (attachment.type.startsWith('image/') ? 'image' : 'file')
        : 'text';
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: activeChat.type,
          target_id: activeChat.id,
          sender_id: currentUserId,
          content: content.trim(),
          message_type: messageType,
          attachment_url: attachment?.url || null,
          attachment_name: attachment?.name || null,
          attachment_type: attachment?.type || null,
          attachment_size: attachment?.size || null
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
    const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` };
    try {
      const res = u.id
        ? await fetch(`${API_BASE}/users/${u.id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ ...u, organization_id: orgId }) })
        : await fetch(`${API_BASE}/users`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ ...u, organization_id: orgId }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '保存に失敗しました');
        return;
      }
      fetchAllData();
    } catch (e) {
      console.error(e);
      alert('保存に失敗しました');
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/users/${id}?organization_id=${auth.user.organization_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '削除に失敗しました');
        return;
      }
      fetchAllData();
    } catch (e) {
      console.error(e);
      alert('削除に失敗しました');
    }
  };

  const handleResetPin = async (userId, newPin) => {
    try {
      const res = await fetch(`${API_BASE}/auth/reset-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ user_id: userId, new_pin: newPin })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'PINのリセットに失敗しました');
        return;
      }
      alert('PINをリセットしました');
    } catch (e) {
      console.error(e);
      alert('PINのリセットに失敗しました');
    }
  };

  const handleSaveDept = async (d) => {
    const orgId = auth.user.organization_id;
    const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` };
    try {
      const res = d.id
        ? await fetch(`${API_BASE}/departments/${d.id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ ...d, organization_id: orgId }) })
        : await fetch(`${API_BASE}/departments`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ ...d, organization_id: orgId }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '保存に失敗しました');
        return;
      }
      fetchAllData();
    } catch (e) {
      console.error(e);
      alert('保存に失敗しました');
    }
  };

  const handleDeleteDept = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/departments/${id}?organization_id=${auth.user.organization_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '削除に失敗しました');
        return;
      }
      fetchAllData();
    } catch (e) {
      console.error(e);
      alert('削除に失敗しました');
    }
  };

  const unhandledCallsCount = callMemos.filter(m => m.status === 'pending').length;

  if (!auth) {
    return authScreen === 'signup'
      ? <SignupScreen onSignup={handleLogin} onBackToLogin={() => setAuthScreen('login')} />
      : <LoginScreen onLogin={handleLogin} onGoToSignup={() => setAuthScreen('signup')} />;
  }

  if (auth.user.must_change_pin) {
    return (
      <ChangePinModal
        auth={auth}
        forced
        onClose={() => {
          const updated = { ...auth, user: { ...auth.user, must_change_pin: false } };
          saveAuth(updated);
          setAuth(updated);
        }}
      />
    );
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
        onOpenChangePin={() => setShowChangePinModal(true)}
        callMemosCount={{ unhandled: unhandledCallsCount, total: callMemos.length }}
        unreadMessagesCount={unreadSummary.total_unread}
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
            organizationId={auth?.user?.organization_id}
            unreadByTarget={unreadSummary.by_target}
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
          auth={auth}
          currentUser={currentUser}
          onClose={() => setShowAdminModal(false)}
          onSaveUser={handleSaveUser}
          onDeleteUser={handleDeleteUser}
          onResetPin={handleResetPin}
          onSaveDept={handleSaveDept}
          onDeleteDept={handleDeleteDept}
          onOpenCsvImport={() => setShowCsvImportModal(true)}
        />
      )}

      {showChangePinModal && (
        <ChangePinModal auth={auth} onClose={() => setShowChangePinModal(false)} />
      )}

      {showCsvImportModal && (
        <CsvImportModal
          auth={auth}
          departments={departments}
          onClose={() => setShowCsvImportModal(false)}
          onImported={fetchAllData}
        />
      )}
    </div>
  );
}
