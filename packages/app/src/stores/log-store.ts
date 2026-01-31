import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  logger,
  LogLevel,
  LogSource,
  type LogEntry,
  type LogLevelName,
  type LogSourceName,
} from "@vcad/core";

interface LogStoreState {
  /** Log entries (last 1000) */
  entries: LogEntry[];
  /** Whether the log panel is open */
  panelOpen: boolean;
  /** Minimum log level to display */
  minLevel: LogLevelName;
  /** Enabled log sources */
  enabledSources: Set<LogSourceName>;

  // Actions
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setMinLevel: (level: LogLevelName) => void;
  toggleSource: (source: LogSourceName) => void;
  clearLogs: () => void;
}

const ALL_SOURCES = new Set(Object.values(LogSource) as LogSourceName[]);

export const useLogStore = create<LogStoreState>()(
  persist(
    (set) => {
      // Subscribe to logger updates
      logger.subscribe((entry) => {
        set((state) => ({
          entries: [...state.entries.slice(-999), entry],
        }));
      });

      // Initialize with existing entries
      const initialEntries = logger.getEntries();

      return {
        entries: initialEntries,
        panelOpen: false,
        minLevel: "DEBUG",
        enabledSources: ALL_SOURCES,

        togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
        openPanel: () => set({ panelOpen: true }),
        closePanel: () => set({ panelOpen: false }),

        setMinLevel: (level: LogLevelName) => set({ minLevel: level }),

        toggleSource: (source: LogSourceName) =>
          set((state) => {
            const newSources = new Set(state.enabledSources);
            if (newSources.has(source)) {
              newSources.delete(source);
            } else {
              newSources.add(source);
            }
            return { enabledSources: newSources };
          }),

        clearLogs: () => {
          logger.clear();
          set({ entries: [] });
        },
      };
    },
    {
      name: "vcad-log-settings",
      partialize: (state) => ({
        minLevel: state.minLevel,
        enabledSources: Array.from(state.enabledSources),
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as {
          minLevel?: LogLevelName;
          enabledSources?: LogSourceName[];
        };
        return {
          ...current,
          minLevel: persistedState?.minLevel ?? current.minLevel,
          enabledSources: persistedState?.enabledSources
            ? new Set(persistedState.enabledSources)
            : current.enabledSources,
        };
      },
    },
  ),
);

/**
 * Get filtered entries based on current settings.
 */
export function getFilteredEntries(state: LogStoreState): LogEntry[] {
  const minLevelValue = LogLevel[state.minLevel];
  return state.entries.filter(
    (entry) =>
      LogLevel[entry.level] >= minLevelValue &&
      state.enabledSources.has(entry.source),
  );
}
