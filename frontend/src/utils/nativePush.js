import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const API_BASE = 'https://callsync-backend.nonba30.workers.dev/api';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

async function registerToken(token, userId) {
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
}
