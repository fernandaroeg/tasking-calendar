import { Capacitor } from '@capacitor/core';

export const platformService = {
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  getApiUrl(path: string): string {
    if (this.isNative()) {
      // In native Android, relative requests fail because origin is local.
      // Route all API requests to the absolute production URL.
      const base = 'https://calendario-ibermex.web.app';
      return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
    }
    return path;
  }
};
