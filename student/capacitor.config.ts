
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mdcatprep.app',
  appName: 'MDCATprep',
  webDir: 'dist',

  server: {
    url: process.env.SITE_URL || 'https://mdcatprep.live',
    cleartext: false,
  },

  android: {
    adjustMarginsForEdgeToEdge: 'force',
  },

  plugins: {
    LiveUpdate: {
      autoUpdateStrategy: 'none',
      autoDeleteBundles: true,
      autoBlockRolledBackBundles: true,
      readyTimeout: 10000,
    },
  },
};

export default config;
