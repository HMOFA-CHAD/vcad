import { cn } from "@/lib/utils";
import type { LogLevelName, LogSourceName } from "@vcad/core";
import { useLogStore } from "@/stores/log-store";

const LEVEL_OPTIONS: { value: LogLevelName; label: string }[] = [
  { value: "DEBUG", label: "Debug" },
  { value: "INFO", label: "Info" },
  { value: "WARN", label: "Warn" },
  { value: "ERROR", label: "Error" },
];

const SOURCE_OPTIONS: { value: LogSourceName; label: string }[] = [
  { value: "kernel", label: "Kernel" },
  { value: "engine", label: "Engine" },
  { value: "app", label: "App" },
  { value: "gpu", label: "GPU" },
  { value: "step", label: "STEP" },
  { value: "mesh", label: "Mesh" },
];

export function LogFilterBar() {
  const minLevel = useLogStore((s) => s.minLevel);
  const setMinLevel = useLogStore((s) => s.setMinLevel);
  const enabledSources = useLogStore((s) => s.enabledSources);
  const toggleSource = useLogStore((s) => s.toggleSource);

  return (
    <div className="flex flex-col gap-2 border-b border-border px-3 py-2">
      {/* Level filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted w-12">
          Level
        </span>
        <div className="flex gap-1">
          {LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMinLevel(opt.value)}
              className={cn(
                "px-2 py-0.5 text-[10px] font-medium transition-colors",
                minLevel === opt.value
                  ? "bg-accent text-white"
                  : "bg-hover text-text-muted hover:text-text",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Source filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted w-12">
          Source
        </span>
        <div className="flex flex-wrap gap-1">
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggleSource(opt.value)}
              className={cn(
                "px-2 py-0.5 text-[10px] font-medium transition-colors",
                enabledSources.has(opt.value)
                  ? "bg-accent text-white"
                  : "bg-hover text-text-muted hover:text-text",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
