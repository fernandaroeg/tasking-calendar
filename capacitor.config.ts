import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mx.grupoibermex.calendario',
  appName: 'calendario-ibermex',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '17140881160-5utgop9tggicj93lbnsf461eh0b0eqiv.apps.googleusercontent.com',
      androidClientId: '17140881160-5utgop9tggicj93lbnsf461eh0b0eqiv.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  } 
};

export default config;
