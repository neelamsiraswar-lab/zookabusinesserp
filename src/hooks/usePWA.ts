import { useState, useEffect, useCallback } from 'react';
import { pwaManager } from '../pwa';

export type DevicePlatform = 'ios' | 'android' | 'desktop' | 'unknown';

export interface StorageEstimateInfo {
  usageMB: number;
  quotaMB: number;
  percentUsed: number;
}

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState<boolean>(() => !!pwaManager.getDeferredPrompt());
  const [isInstalled, setIsInstalled] = useState<boolean>(() => pwaManager.isStandalone());
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(() => pwaManager.isUpdateAvailable());
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [storageInfo, setStorageInfo] = useState<StorageEstimateInfo | null>(null);

  // Detect user platform
  const [platform, setPlatform] = useState<DevicePlatform>('unknown');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(userAgent);

    if (isIos) {
      setPlatform('ios');
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Subscribe to PWA Manager state changes
    const unsubscribe = pwaManager.subscribe(() => {
      setIsInstallable(!!pwaManager.getDeferredPrompt());
      setIsInstalled(pwaManager.isStandalone());
      setIsUpdateAvailable(pwaManager.isUpdateAvailable());
    });

    // Online / Offline tracking
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Track standalone display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches || pwaManager.isStandalone());
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    }

    // Storage Estimate Query
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 1;
        setStorageInfo({
          usageMB: +(usage / (1024 * 1024)).toFixed(2),
          quotaMB: +(quota / (1024 * 1024)).toFixed(0),
          percentUsed: Math.min(100, Math.round((usage / quota) * 100))
        });
      }).catch(() => {});
    }

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);

  const installPwa = useCallback(async () => {
    return await pwaManager.install();
  }, []);

  const applyUpdate = useCallback(() => {
    pwaManager.applyUpdate();
  }, []);

  return {
    isInstallable,
    isInstalled,
    isUpdateAvailable,
    isOnline,
    platform,
    storageInfo,
    installPwa,
    applyUpdate,
    canPromptNative: !!pwaManager.getDeferredPrompt(),
  };
}
