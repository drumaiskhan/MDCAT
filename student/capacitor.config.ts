import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medschoolproffs.student',
  appName: 'MDCAT Proffs',
  webDir: 'dist',

  // Live mode: the app loads the real website, so site updates show instantly.
  // Change SITE_URL (or set the SITE_URL env var when building) to your student site.
  server: {
    url: process.env.SITE_URL || 'https://mdcatprep.live',
    cleartext: false,
  },

  // Android 15 (targetSdk 35) draws edge-to-edge, which put the app header
  // under the status bar. This insets the WebView below the system bars.
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
