import React, { useEffect, useState } from 'react';
import { BarChart3, Clock, PhoneIncoming, CheckCircle2, TrendingUp } from 'lucide-react';

const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function formatMinutes(min) {
  if (min == null) return '—';
  if (min < 60) return `${Math.round(min)}分`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

function Bar({ label, count, max, suffix = '件' }) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
  return (
    <div className="analytics-bar-row">
      <span className="analytics-bar-label" title={label}>{label}</span>
      <div className="analytics-bar-track">
        <div className="analytics-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <strong className="analytics-bar-value">{count}{suffix}</strong>
    </div>
  );
}

export default function CallAnalyticsView({ auth }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch(`${API_BASE}/call-memos/analytics?days=${days}`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(res.status === 403 ? '管理者権限が必要です' : '取得に失敗しました');
        return res.json();
      })
      .then(json => { if (!cancelled) setData(json); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [auth.token, days]);

  if (error) {
    return <div className="analytics-empty-state">⚠️ {error}</div>;
  }
  if (!data) {
    return <div className="analytics-empty-state">読み込み中...</div>;
  }

  const { overview, byCompany, byRecipient, byResolver, byWeekday, byHour, dailyTrend } = data;
  const maxCompany = Math.max(0, ...byCompany.map(r => r.count));
  const maxRecipient = Math.max(0, ...byRecipient.map(r => r.count));
  const maxResolver = Math.max(0, ...byResolver.map(r => r.count));
  const weekdayMap = new Map(byWeekday.map(r => [r.weekday, r.count]));
  const maxWeekday = Math.max(0, ...byWeekday.map(r => r.count));
  const hourMap = new Map(byHour.map(r => [r.hour, r.count]));
  const maxHour = Math.max(0, ...byHour.map(r => r.count));
  const maxDaily = Math.max(0, ...dailyTrend.map(r => r.count));

  return (
    <div className="analytics-view">
      <div className="analytics-range-toggle">
        {[
          { v: 7, label: '過去7日' },
          { v: 30, label: '過去30日' },
          { v: 90, label: '過去90日' },
          { v: 'all', label: '全期間' }
        ].map(opt => (
          <button
            key={opt.v}
            className={`analytics-range-btn ${days === opt.v ? 'active' : ''}`}
            onClick={() => setDays(opt.v)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="analytics-stat-cards">
        <div className="analytics-stat-card">
          <PhoneIncoming size={18} />
          <span className="analytics-stat-label">総受電件数</span>
          <strong className="analytics-stat-value">{overview.total}</strong>
        </div>
        <div className="analytics-stat-card">
          <BarChart3 size={18} />
          <span className="analytics-stat-label">未対応</span>
          <strong className="analytics-stat-value">{overview.pending}</strong>
        </div>
        <div className="analytics-stat-card">
          <CheckCircle2 size={18} />
          <span className="analytics-stat-label">完了</span>
          <strong className="analytics-stat-value">{overview.resolved}</strong>
        </div>
        <div className="analytics-stat-card">
          <Clock size={18} />
          <span className="analytics-stat-label">平均対応時間</span>
          <strong className="analytics-stat-value">{formatMinutes(overview.avg_resolution_minutes)}</strong>
        </div>
      </div>

      {dailyTrend.length > 0 && (
        <div className="analytics-section">
          <h3><TrendingUp size={16} /> 日別の入電件数(直近30日)</h3>
          <div className="analytics-trend-chart">
            {dailyTrend.map(row => (
              <div key={row.date} className="analytics-trend-col" title={`${row.date}: ${row.count}件`}>
                <div
                  className="analytics-trend-bar"
                  style={{ height: `${maxDaily > 0 ? Math.max(4, Math.round((row.count / maxDaily) * 100)) : 0}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="analytics-columns">
        <div className="analytics-section">
          <h3>取引先別 受電件数</h3>
          {byCompany.length === 0 ? <p className="analytics-empty-note">データがありません</p> :
            byCompany.map(row => <Bar key={row.company_name} label={row.company_name} count={row.count} max={maxCompany} />)}
        </div>

        <div className="analytics-section">
          <h3>宛先別 受電件数</h3>
          {byRecipient.length === 0 ? <p className="analytics-empty-note">データがありません</p> :
            byRecipient.map(row => (
              <Bar key={`${row.target_type}-${row.target_id}`} label={row.target_name || '(宛先未設定)'} count={row.count} max={maxRecipient} />
            ))}
        </div>
      </div>

      <div className="analytics-columns">
        <div className="analytics-section">
          <h3>対応者別 件数・平均対応時間</h3>
          {byResolver.length === 0 ? <p className="analytics-empty-note">データがありません</p> : (
            <table className="analytics-table">
              <thead><tr><th>対応者</th><th>件数</th><th>平均対応時間</th></tr></thead>
              <tbody>
                {byResolver.map(row => (
                  <tr key={row.resolved_by}>
                    <td>{row.resolver_name || '(退職済み)'}</td>
                    <td>{row.count}</td>
                    <td>{formatMinutes(row.avg_resolution_minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="analytics-section">
          <h3>曜日・時間帯別 傾向</h3>
          <div className="analytics-weekday-row">
            {WEEKDAY_LABELS.map((label, idx) => (
              <Bar key={idx} label={label} count={weekdayMap.get(idx) || 0} max={maxWeekday} />
            ))}
          </div>
          <div className="analytics-hour-chart">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="analytics-hour-col" title={`${h}時: ${hourMap.get(h) || 0}件`}>
                <div
                  className="analytics-hour-bar"
                  style={{ height: `${maxHour > 0 ? Math.max(2, Math.round(((hourMap.get(h) || 0) / maxHour) * 100)) : 0}%` }}
                />
                {h % 3 === 0 && <span className="analytics-hour-label">{h}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
