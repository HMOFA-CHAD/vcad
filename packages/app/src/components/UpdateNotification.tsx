import { useEffect, useRef } from "react";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { useNotificationStore } from "@/stores/notification-store";

export function UpdateNotification() {
  const { updateAvailable, offlineReady, applyUpdate, dismissUpdate, dismissOfflineReady } =
    useAppUpdate();
  const showWarning = useNotificationStore((s) => s.showWarning);
  const toast = useNotificationStore((s) => s.toast);

  // Track which notifications we've already shown
  const shownUpdate = useRef(false);
  const shownOffline = useRef(false);

  // Show update available warning
  useEffect(() => {
    if (updateAvailable && !shownUpdate.current) {
      shownUpdate.current = true;
      showWarning({
        category: "suggestion",
        title: "Update Available",
        description: "A new version of vcad is ready.",
        actions: [
          {
            label: "Refresh Now",
            variant: "primary",
            onClick: () => applyUpdate(),
          },
          {
            label: "Later",
            variant: "secondary",
            onClick: () => dismissUpdate(),
          },
        ],
      });
    }
  }, [updateAvailable, showWarning, applyUpdate, dismissUpdate]);

  // Show offline ready toast
  useEffect(() => {
    if (offlineReady && !shownOffline.current) {
      shownOffline.current = true;
      toast.success("App ready for offline use");
      dismissOfflineReady();
    }
  }, [offlineReady, toast, dismissOfflineReady]);

  return null;
}
