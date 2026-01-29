import { useSyncExternalStore } from "react";
import { useUiStore } from "@vcad/core";

const darkMq = typeof window !== "undefined"
  ? window.matchMedia("(prefers-color-scheme: dark)")
  : null;

function subscribeToSystemTheme(callback: () => void) {
  darkMq?.addEventListener("change", callback);
  return () => darkMq?.removeEventListener("change", callback);
}

function getSystemIsDark() {
  return darkMq?.matches ?? true;
}

export function useTheme() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const systemIsDark = useSyncExternalStore(subscribeToSystemTheme, getSystemIsDark, () => true);

  const isDark = theme === "system" ? systemIsDark : theme === "dark";

  return { theme, toggleTheme, isDark };
}
