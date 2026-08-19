const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';

export const ALLOWED_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
export const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024; // 15MB

export async function uploadAttachment(file, organizationId) {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    throw new Error('画像またはPDFのみ添付できます');
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error('ファイルサイズは15MBまでです');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('organization_id', organizationId || 1);

  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'アップロードに失敗しました');
  }
  return res.json();
}
