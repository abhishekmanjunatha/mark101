import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.peepal.app',
  appName: 'peepal',
  webDir: 'out',
  server: {
    // For development: point to local dev server instead of bundled files
    // Comment this out for production mobile builds
    url: 'http://localhost:3000',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#ffffff',
    },
    StatusBar: {
      style: 'Light',
      backgroundColor: '#ffffff',
    },
  },
}

export default config

