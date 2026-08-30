const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';

export const ALLOWED_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'video/quicktime', 'video/webm'];
export const VIDEO_ATTACHMENT_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
export const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024; // 15MB（画像・PDF）
export const MAX_VIDEO_ATTACHMENT_SIZE = 30 * 1024 * 1024; // 30MB（動画。短い業務連絡用の想定）

export function isVideoAttachment(type) {
  return VIDEO_ATTACHMENT_TYPES.includes(type);
}

export async function uploadAttachment(file, organizationId) {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    throw new Error('画像・PDF・動画のみ添付できます');
  }
  const isVideo = isVideoAttachment(file.type);
  if (isVideo && file.size > MAX_VIDEO_ATTACHMENT_SIZE) {
    throw new Error('動画は30MBまでです。短い動画をご利用ください');
  }
  if (!isVideo && file.size > MAX_ATTACHMENT_SIZE) {
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
