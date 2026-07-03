import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import MobileView from './components/MobileView';
import HistoryView from './components/HistoryView';

function AppContent() {
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const location = useLocation();

  const fetchData = async () => {
    try {
      const [depsRes, usersRes, msgsRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/users'),
        fetch('/api/messages')
      ]);
      const [depsData, usersData, msgsData] = await Promise.all([
        depsRes.json(),
        usersRes.json(),
        msgsRes.json()
      ]);
      setDepartments(depsData);
      setUsers(usersData);
      setMessages(msgsData);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDataChanged = () => {
    fetchData();
  };

  const isMobile = location.pathname === '/mobile';
  const isHistory = location.pathname === '/history';

  return (
    <div className={`app-container ${isMobile ? 'mobile-view' : ''}`}>
      <header className="glass">
        <div className="logo">CallSync ✨</div>
        {!isHistory && (
          <div className="view-toggle">
            <Link to="/" className={location.pathname === '/' ? 'active btn' : 'btn'} style={{textDecoration: 'none'}}>
              事務員ビュー
            </Link>
            <Link to="/mobile" className={location.pathname === '/mobile' ? 'active btn' : 'btn'} style={{textDecoration: 'none'}}>
              現場ビュー
            </Link>
          </div>
        )}
        {isHistory && (
          <Link to="/" className="btn btn-primary" style={{textDecoration: 'none'}}>
            戻る
          </Link>
        )}
      </header>
      
      <main>
        <Routes>
          <Route path="/" element={
            <Dashboard 
              departments={departments} 
              users={users} 
              messages={messages} 
              onDataChanged={handleDataChanged} 
            />
          } />
          <Route path="/mobile" element={
            <MobileView 
              departments={departments} 
              users={users} 
              messages={messages} 
              onDataChanged={handleDataChanged}
            />
          } />
          <Route path="/history" element={
            <HistoryView />
          } />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
