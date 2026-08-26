import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

const FCM_TOKEN_STORAGE_KEY = 'callsync_fcm_token';

async function registerToken(token, userId) {
  // ログアウト時にこの端末専用のトークンだけを解除できるよう、ローカルにも控えておく
  // （Capacitorのプラグインには「今のトークンを取得する」APIがなく、登録イベントの
  // タイミングでしか得られないため）
  localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
  await fetch(`${API_BASE}/push/register-fcm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      token,
      platform: Capacitor.getPlatform() // 'android' | 'ios'
    })
  });
}

// ログアウト時に呼ぶ。この端末のFCM登録だけを解除する（ユーザー単位ではなく
// トークン単位で消すので、同じ人が複数端末でログインしていても他端末には影響しない）
export async function unregisterNativePush() {
  if (!isNativeApp()) return;
  const token = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
  if (!token) return;
  try {
    await fetch(`${API_BASE}/push/unregister-fcm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
  } catch (e) {
    console.error('FCM unregister failed', e);
  } finally {
    localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
  }
}

// ネイティブアプリ内でのみ有効。Web版ではWeb Push(utils/push.js)を使う。
// 権限が拒否済み、または端末側のFCM登録自体が失敗した場合は例外を投げる
// (呼び出し側でユーザーにはっきり伝えるため。以前は静かにfalseを返すだけで
// 「通知ON」表示のまま実際には何も登録されない、という不具合があった)。
export async function setupNativePush(userId) {
  if (!isNativeApp()) return false;

  const permStatus = await PushNotifications.checkPermissions();
  let granted = permStatus.receive === 'granted';
  if (!granted && permStatus.receive !== 'denied') {
    const requested = await PushNotifications.requestPermissions();
    granted = requested.receive === 'granted';
  }
  if (!granted) {
    const err = new Error('通知の権限が拒否されています。端末の「設定」→「アプリ」→本アプリ→「通知」から手動で許可してください。');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    PushNotifications.addListener('registration', (token) => {
      registerToken(token.value, userId).catch((e) => console.error('FCM token registration failed', e));
      if (!settled) { settled = true; resolve(true); }
    });
    PushNotifications.addListener('registrationError', (err) => {
      console.error('FCM registration error', err);
      if (!settled) {
        settled = true;
        const e = new Error('通知の登録に失敗しました。時間をおいてもう一度お試しください。');
        e.code = 'REGISTRATION_FAILED';
        reject(e);
      }
    });

    PushNotifications.register();

    // registration/registrationError のどちらも来ない端末対策のタイムアウト
    setTimeout(() => {
      if (!settled) {
        settled = true;
        const e = new Error('通知の登録がタイムアウトしました。時間をおいてもう一度お試しください。');
        e.code = 'REGISTRATION_TIMEOUT';
        reject(e);
      }
    }, 10000);
  });
}export function setupNativePushListeners(onNavigate) {
  if (!isNativeApp()) return;

  // Handle push notification click when app is in background/foreground
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    try {
      const data = notification.notification?.data || {};
      let targetType = data.targetType || data.target_type;
      let targetId = data.targetId || data.target_id;

      if (data.type === 'call_memo' || data.memoId) {
        onNavigate({ app: 'callsync', memoId: data.memoId });
      } else if (targetType && targetId) {
        onNavigate({ app: 'chat', targetType, targetId });
      } else if (data.url) {
        const parsed = new URL(data.url, 'http://localhost');
        const app = parsed.searchParams.get('app');
        const tt = parsed.searchParams.get('target_type');
        const ti = parsed.searchParams.get('target_id');
        onNavigate({ app: app || 'chat', targetType: tt, targetId: ti });
      }
    } catch (err) {
      console.error('Error handling push notification action', err);
    }
  });
}
