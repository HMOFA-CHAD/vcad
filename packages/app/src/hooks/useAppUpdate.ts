import { useRegisterSW } from "virtual:pwa-register/react";
import { useCallback, useEffect, useRef } from "react";

export function useAppUpdate() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    needRefresh: [updateAvailable, setUpdateAvailable],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_, r) {
      // Check for updates hourly
      if (!r) return;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(() => r.update(), 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    updateAvailable,
    offlineReady,
    applyUpdate: useCallback(
      () => updateServiceWorker(true),
      [updateServiceWorker]
    ),
    dismissUpdate: useCallback(
      () => setUpdateAvailable(false),
      [setUpdateAvailable]
    ),
    dismissOfflineReady: useCallback(
      () => setOfflineReady(false),
      [setOfflineReady]
    ),
    version: __APP_VERSION__,
    buildTime: __BUILD_TIME__,
  };
}
