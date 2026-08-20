import React, { useState, useRef } from 'react';
import { X, Upload, Download, FileSpreadsheet } from 'lucide-react';

const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';
const TEMPLATE_HEADER = '氏名,ID（先頭の組織番号は自動で付きます）,部門,権限,初期PIN';
const TEMPLATE_SAMPLE = '山田太郎,yamada,営業部,一般,1234\n鈴木花子,suzuki-hanako,総務・人事部,管理者,';

function parseCsv(text) {
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];
  const dataLines = lines[0].includes('氏名') || lines[0].toLowerCase().includes('name') ? lines.slice(1) : lines;
  return dataLines.map(line => {
    const cells = line.split(',').map(c => c.trim());
    return {
      name: cells[0] || '',
      email: cells[1] || '',
      department: cells[2] || '',
      role: cells[3] || '',
      pin: cells[4] || ''
    };
  });
}

function normalizeRole(raw) {
  const v = (raw || '').trim().toLowerCase();
  return (v === '管理者' || v === 'admin') ? 'admin' : 'user';
}

export default function CsvImportModal({ auth, departments, onClose, onImported }) {
  const orgCode = String(auth.user.organization_id).padStart(3, '0');
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null); // [{row, ok, message}]
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);
    const reader = new FileReader();
    reader.onload = () => setRows(parseCsv(String(reader.result)));
    reader.readAsText(file, 'utf-8');
  };

  const downloadTemplate = () => {
    const csv = `${TEMPLATE_HEADER}\n${TEMPLATE_SAMPLE}`;
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'アカウント登録テンプレート.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    setImporting(true);
    const orgId = auth.user.organization_id;
    const deptCache = new Map(departments.map(d => [d.name, d.id]));
    const rowResults = [];

    for (const row of rows) {
      if (!row.name || !row.email) {
        rowResults.push({ row, ok: false, message: '氏名またはIDが空です' });
        continue;
      }
      if (row.pin && !/^\d{4,8}$/.test(row.pin)) {
        rowResults.push({ row, ok: false, message: 'PINは4〜8桁の数字である必要があります' });
        continue;
      }

      try {
        let departmentId = null;
        if (row.department) {
          if (deptCache.has(row.department)) {
            departmentId = deptCache.get(row.department);
          } else {
            const deptRes = await fetch(`${API_BASE}/departments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
              body: JSON.stringify({ name: row.department, organization_id: orgId })
            });
            const deptData = await deptRes.json();
            departmentId = deptData.id;
            deptCache.set(row.department, departmentId);
          }
        }

        const res = await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
          body: JSON.stringify({
            name: row.name,
            email: `${orgCode}_${row.email.trim().replace(/\s+/g, '')}`,
            department_id: departmentId,
            role: normalizeRole(row.role),
            pin: row.pin || undefined,
            organization_id: orgId
          })
        });
        const data = await res.json();
        if (!res.ok) {
          rowResults.push({ row, ok: false, message: data.error || '登録に失敗しました' });
        } else {
          rowResults.push({ row, ok: true, message: '登録しました' });
        }
      } catch (e) {
        rowResults.push({ row, ok: false, message: '通信エラー' });
      }
    }

    setResults(rowResults);
    setImporting(false);
    onImported();
  };

  const successCount = results?.filter(r => r.ok).length || 0;
  const failCount = results?.filter(r => !r.ok).length || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FileSpreadsheet size={20} color="#7d68a8" />
            CSVでまとめて登録
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div style={{ fontSize: '0.82rem', color: '#48564c', lineHeight: 1.6 }}>
            1行目は見出し行として無視されます。列の並びは「氏名, ID, 部門, 権限（一般/管理者）, 初期PIN」の順で固定です（部門・権限・PINは空欄でも構いません）。IDには先頭に組織番号「{orgCode}_」が自動的に付きます（CSVには自由な部分だけ入力してください）。PINを空欄にした場合は「0000」になり、本人には初回ログイン時の変更をお願いする仕様です。
          </div>

          <button
            type="button"
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}
            onClick={downloadTemplate}
          >
            <Download size={14} /> テンプレートをダウンロード
          </button>

          <div className="form-group">
            <label className="form-label">CSVファイル</label>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} />
          </div>

          {rows.length > 0 && !results && (
            <div style={{ border: '1px solid #e8e2d8', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: '#f8f5ef', fontSize: '0.78rem', fontWeight: 700 }}>
                {fileName}（{rows.length}件を読み込みました）
              </div>
              <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                {rows.map((r, i) => (
                  <div key={i} style={{ padding: '6px 12px', fontSize: '0.78rem', borderTop: '1px solid #f0ece0', display: 'flex', gap: '10px' }}>
                    <span style={{ fontWeight: 700, minWidth: '80px' }}>{r.name || '(氏名なし)'}</span>
                    <span style={{ color: '#66766c' }}>{r.email ? `${orgCode}_${r.email}` : '(IDなし)'}</span>
                    <span style={{ color: '#66766c' }}>{r.department || '未所属'}</span>
                    <span style={{ color: '#66766c' }}>{normalizeRole(r.role) === 'admin' ? '管理者' : '一般'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results && (
            <div style={{ border: '1px solid #e8e2d8', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: '#e6f2ea', fontSize: '0.82rem', fontWeight: 700 }}>
                成功 {successCount}件 / 失敗 {failCount}件
              </div>
              <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                {results.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '6px 12px', fontSize: '0.78rem', borderTop: '1px solid #f0ece0',
                      display: 'flex', gap: '10px', color: r.ok ? '#48564c' : '#c2604f'
                    }}
                  >
                    <span style={{ fontWeight: 700, minWidth: '80px' }}>{r.row.name || '(氏名なし)'}</span>
                    <span>{r.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>閉じる</button>
            {rows.length > 0 && !results && (
              <button
                type="button"
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={runImport}
                disabled={importing}
              >
                <Upload size={14} /> {importing ? 'インポート中…' : `${rows.length}件をインポート`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
