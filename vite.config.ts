import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables securely on the Node.js side (server)
  const env = loadEnv(mode, process.cwd(), '');
  const mailtrapToken = env.VITE_MAILTRAP_API_TOKEN || env.MAILTRAP_API_TOKEN;

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/mailtrap/send': {
          target: 'https://send.api.mailtrap.io',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/mailtrap\/send/, ''),
          configure: (proxy: any) => {
            proxy.on('proxyReq', (proxyReq: any) => {
              // Strip browser-specific origin/referer headers to prevent Mailtrap's 403 CORS protection
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
              // Securely inject authentication headers on the server side
              if (mailtrapToken) {
                proxyReq.setHeader('Authorization', `Bearer ${mailtrapToken}`);
                proxyReq.setHeader('Api-Token', mailtrapToken);
              }
            });
          }
        },
        '/api/mailtrap/sandbox': {
          target: 'https://sandbox.api.mailtrap.io',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/mailtrap\/sandbox/, ''),
          configure: (proxy: any) => {
            proxy.on('proxyReq', (proxyReq: any) => {
              // Strip browser-specific origin/referer headers
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
              // Securely inject authentication headers on the server side
              if (mailtrapToken) {
                proxyReq.setHeader('Authorization', `Bearer ${mailtrapToken}`);
                proxyReq.setHeader('Api-Token', mailtrapToken);
              }
            });
          }
        }
      }
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/setupTests.ts',
    }
  } as any;
});
