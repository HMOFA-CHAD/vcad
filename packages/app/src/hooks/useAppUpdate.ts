import { useRegisterSW } from "virtual:pwa-register/react";
import { useCallback } from "react";

export function useAppUpdate() {
  const {
    needRefresh: [updateAvailable, setUpdateAvailable],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_, r) {
      // Check for updates hourly
      if (r) setInterval(() => r.update(), 60 * 60 * 1000);
    },
  });

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
