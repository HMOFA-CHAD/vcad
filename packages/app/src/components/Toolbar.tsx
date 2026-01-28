import {
  Cube,
  Cylinder,
  Globe,
  ArrowsOutCardinal,
  ArrowClockwise,
  ArrowsOut,
  ArrowCounterClockwise,
  SidebarSimple,
  Sun,
  Moon,
  Info,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useDocumentStore } from "@/stores/document-store";
import { useUiStore } from "@/stores/ui-store";
import { useTheme } from "@/hooks/useTheme";
import type { PrimitiveKind, TransformMode } from "@/types";

const PRIMITIVES: { kind: PrimitiveKind; icon: typeof Cube; label: string }[] =
  [
    { kind: "cube", icon: Cube, label: "Box" },
    { kind: "cylinder", icon: Cylinder, label: "Cylinder" },
    { kind: "sphere", icon: Globe, label: "Sphere" },
  ];

const TRANSFORM_MODES: {
  mode: TransformMode;
  icon: typeof ArrowsOutCardinal;
  label: string;
  shortcut: string;
}[] = [
  {
    mode: "translate",
    icon: ArrowsOutCardinal,
    label: "Move",
    shortcut: "W",
  },
  { mode: "rotate", icon: ArrowClockwise, label: "Rotate", shortcut: "E" },
  { mode: "scale", icon: ArrowsOut, label: "Scale", shortcut: "R" },
];

export function Toolbar({ onAboutOpen }: { onAboutOpen: () => void }) {
  const addPrimitive = useDocumentStore((s) => s.addPrimitive);
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const undoStack = useDocumentStore((s) => s.undoStack);
  const redoStack = useDocumentStore((s) => s.redoStack);

  const select = useUiStore((s) => s.select);
  const transformMode = useUiStore((s) => s.transformMode);
  const setTransformMode = useUiStore((s) => s.setTransformMode);
  const toggleFeatureTree = useUiStore((s) => s.toggleFeatureTree);

  const { isDark, toggleTheme } = useTheme();

  function handleAddPrimitive(kind: PrimitiveKind) {
    const partId = addPrimitive(kind);
    select(partId);
    setTransformMode("translate");
  }

  return (
    <div className="fixed left-1/2 top-3 z-30 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card/80 px-2 py-1.5 shadow-2xl backdrop-blur-xl">
        {/* Feature tree toggle */}
        <Tooltip content="Feature tree">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleFeatureTree}
          >
            <SidebarSimple size={16} />
          </Button>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Primitives */}
        {PRIMITIVES.map(({ kind, icon: Icon, label }) => (
          <Tooltip key={kind} content={`Add ${label}`}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleAddPrimitive(kind)}
            >
              <Icon size={16} />
            </Button>
          </Tooltip>
        ))}

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Transform modes */}
        {TRANSFORM_MODES.map(({ mode, icon: Icon, label, shortcut }) => (
          <Tooltip key={mode} content={`${label} (${shortcut})`}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setTransformMode(mode)}
              className={
                transformMode === mode
                  ? "bg-accent/20 text-accent"
                  : undefined
              }
            >
              <Icon size={16} />
            </Button>
          </Tooltip>
        ))}

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Undo/Redo */}
        <Tooltip content="Undo (Ctrl+Z)">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={undo}
            disabled={undoStack.length === 0}
          >
            <ArrowCounterClockwise size={16} />
          </Button>
        </Tooltip>
        <Tooltip content="Redo (Ctrl+Shift+Z)">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={redo}
            disabled={redoStack.length === 0}
          >
            <ArrowClockwise size={16} />
          </Button>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Theme toggle */}
        <Tooltip content={isDark ? "Light mode" : "Dark mode"}>
          <Button variant="ghost" size="icon-sm" onClick={toggleTheme}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* About */}
        <Tooltip content="About vcad">
          <Button variant="ghost" size="icon-sm" onClick={onAboutOpen}>
            <Info size={16} />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
