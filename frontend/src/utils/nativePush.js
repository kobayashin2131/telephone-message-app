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
export async function setupNativePush(userId) {
  if (!isNativeApp()) return false;

  const permStatus = await PushNotifications.checkPermissions();
  let granted = permStatus.receive === 'granted';
  if (!granted && permStatus.receive !== 'denied') {
    const requested = await PushNotifications.requestPermissions();
    granted = requested.receive === 'granted';
  }
  if (!granted) return false;

  PushNotifications.addListener('registration', (token) => {
    registerToken(token.value, userId).catch((e) => console.error('FCM token registration failed', e));
  });
  PushNotifications.addListener('registrationError', (err) => {
    console.error('FCM registration error', err);
  });

  await PushNotifications.register();
  return true;
}
