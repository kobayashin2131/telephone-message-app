import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.easystance.connectsuite',
  appName: 'Connect Suite',
  webDir: 'dist',
  server: {
    // 起動時にローカルファイルではなく、直接本番サイト(Cloudflare Pages)を読み込む設定。
    // Web側の更新はアプリの再ビルドなしにそのまま反映される。
    url: 'https://callsync-app.pages.dev',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
