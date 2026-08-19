// D1/SQLite の CURRENT_TIMESTAMP は "YYYY-MM-DD HH:MM:SS" 形式のUTC時刻を
// タイムゾーン情報なしで返す。そのまま new Date() に渡すとブラウザによっては
// 「既にローカル時刻」として誤読され、日本時間では9時間ずれて表示される。
// 'T' 区切り + 'Z' を補って明示的にUTCとして解釈させる。
export function parseDbTimestamp(value) {
  if (!value) return null;
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  return new Date(iso);
}

export function formatTime(value) {
  const date = parseDbTimestamp(value);
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
