import { useUiStore } from "@/stores/ui-store";

export function useTheme() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  return { theme, toggleTheme, isDark: theme === "dark" };
}
