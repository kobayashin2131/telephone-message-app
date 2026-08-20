import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.easystance.connectsuite',
  appName: 'Connect Suite',
  webDir: 'dist',
  server: {
    // 起動時にローカルファイルではなく、直接本番サイト(Cloudflare Workers)を読み込む設定。
    // Web側の更新はアプリの再ビルドなしにそのまま即時反映される。
    url: 'https://callsync-backend.nonba30.workers.dev',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
