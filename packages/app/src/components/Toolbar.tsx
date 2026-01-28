import {
  Cube,
  Cylinder,
  Globe,
  ArrowCounterClockwise,
  ArrowClockwise,
  SidebarSimple,
  Sun,
  Moon,
  Info,
  Unite,
  Subtract,
  Intersect,
  FloppyDisk,
  FolderOpen,
  Export,
  GridFour,
  CubeTransparent,
  DotsThree,
  Command,
} from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useDocumentStore } from "@/stores/document-store";
import { useUiStore } from "@/stores/ui-store";
import { useEngineStore } from "@/stores/engine-store";
import { useTheme } from "@/hooks/useTheme";
import type { PrimitiveKind, BooleanType } from "@/types";
import { exportStl } from "@/lib/export-stl";
import { exportGltf } from "@/lib/export-gltf";
import { downloadBlob } from "@/lib/download";

const PRIMITIVES: { kind: PrimitiveKind; icon: typeof Cube; label: string }[] =
  [
    { kind: "cube", icon: Cube, label: "Box" },
    { kind: "cylinder", icon: Cylinder, label: "Cylinder" },
    { kind: "sphere", icon: Globe, label: "Sphere" },
  ];

const BOOLEANS: {
  type: BooleanType;
  icon: typeof Unite;
  label: string;
  shortcut: string;
}[] = [
  { type: "union", icon: Unite, label: "Union", shortcut: "⌘⇧U" },
  { type: "difference", icon: Subtract, label: "Difference", shortcut: "⌘⇧D" },
  { type: "intersection", icon: Intersect, label: "Intersection", shortcut: "⌘⇧I" },
];

function OverflowMenu({
  onAboutOpen,
  onSave,
  onOpen,
}: {
  onAboutOpen: () => void;
  onSave: () => void;
  onOpen: () => void;
}) {
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const undoStack = useDocumentStore((s) => s.undoStack);
  const redoStack = useDocumentStore((s) => s.redoStack);
  const parts = useDocumentStore((s) => s.parts);

  const showWireframe = useUiStore((s) => s.showWireframe);
  const toggleWireframe = useUiStore((s) => s.toggleWireframe);
  const gridSnap = useUiStore((s) => s.gridSnap);
  const toggleGridSnap = useUiStore((s) => s.toggleGridSnap);

  const scene = useEngineStore((s) => s.scene);
  const { isDark, toggleTheme } = useTheme();

  const hasParts = parts.length > 0;

  function handleExportStl() {
    if (!scene) return;
    const blob = exportStl(scene);
    downloadBlob(blob, "model.stl");
  }

  function handleExportGlb() {
    if (!scene) return;
    const blob = exportGltf(scene);
    downloadBlob(blob, "model.glb");
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="icon-sm">
          <DotsThree size={16} weight="bold" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-56 rounded-xl border border-border bg-card/95 p-2 shadow-2xl backdrop-blur-xl"
          sideOffset={8}
          align="end"
        >
          <div className="grid grid-cols-2 gap-1">
            {/* Edit */}
            <div className="col-span-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Edit
            </div>
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text hover:bg-border/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowCounterClockwise size={14} />
              <span>Undo</span>
              <span className="ml-auto text-text-muted">⌘Z</span>
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text hover:bg-border/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowClockwise size={14} />
              <span>Redo</span>
              <span className="ml-auto text-text-muted">⌘⇧Z</span>
            </button>

            {/* View */}
            <div className="col-span-2 mt-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              View
            </div>
            <button
              onClick={toggleWireframe}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text hover:bg-border/30"
            >
              <CubeTransparent size={14} className={showWireframe ? "text-accent" : ""} />
              <span>Wireframe</span>
              <span className="ml-auto text-text-muted">X</span>
            </button>
            <button
              onClick={toggleGridSnap}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text hover:bg-border/30"
            >
              <GridFour size={14} className={gridSnap ? "text-accent" : ""} />
              <span>Grid Snap</span>
              <span className="ml-auto text-text-muted">G</span>
            </button>

            {/* File */}
            <div className="col-span-2 mt-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              File
            </div>
            <button
              onClick={onSave}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text hover:bg-border/30"
            >
              <FloppyDisk size={14} />
              <span>Save</span>
              <span className="ml-auto text-text-muted">⌘S</span>
            </button>
            <button
              onClick={onOpen}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text hover:bg-border/30"
            >
              <FolderOpen size={14} />
              <span>Open</span>
              <span className="ml-auto text-text-muted">⌘O</span>
            </button>
            <button
              onClick={handleExportStl}
              disabled={!hasParts}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text hover:bg-border/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Export size={14} />
              <span>Export STL</span>
            </button>
            <button
              onClick={handleExportGlb}
              disabled={!hasParts}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text hover:bg-border/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Export size={14} weight="fill" />
              <span>Export GLB</span>
            </button>

            {/* Settings */}
            <div className="col-span-2 mt-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Settings
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text hover:bg-border/30"
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </button>
            <button
              onClick={onAboutOpen}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text hover:bg-border/30"
            >
              <Info size={14} />
              <span>About</span>
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Toolbar({
  onAboutOpen,
  onSave,
  onOpen,
}: {
  onAboutOpen: () => void;
  onSave: () => void;
  onOpen: () => void;
}) {
  const addPrimitive = useDocumentStore((s) => s.addPrimitive);
  const applyBoolean = useDocumentStore((s) => s.applyBoolean);

  const select = useUiStore((s) => s.select);
  const selectedPartIds = useUiStore((s) => s.selectedPartIds);
  const setTransformMode = useUiStore((s) => s.setTransformMode);
  const toggleFeatureTree = useUiStore((s) => s.toggleFeatureTree);
  const toggleCommandPalette = useUiStore((s) => s.toggleCommandPalette);

  const hasTwoSelected = selectedPartIds.size === 2;

  function handleAddPrimitive(kind: PrimitiveKind) {
    const partId = addPrimitive(kind);
    select(partId);
    setTransformMode("translate");
  }

  function handleBoolean(type: BooleanType) {
    if (!hasTwoSelected) return;
    const ids = Array.from(selectedPartIds);
    const newId = applyBoolean(type, ids[0]!, ids[1]!);
    if (newId) select(newId);
  }

  return (
    <div className="fixed left-1/2 top-3 z-30 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card/80 px-2 py-1.5 shadow-2xl backdrop-blur-xl">
        {/* Feature tree toggle */}
        <Tooltip content="Toggle sidebar">
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

        {/* Boolean operations */}
        {BOOLEANS.map(({ type, icon: Icon, label, shortcut }) => (
          <Tooltip key={type} content={`${label} (${shortcut})`}>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!hasTwoSelected}
              onClick={() => handleBoolean(type)}
            >
              <Icon size={16} />
            </Button>
          </Tooltip>
        ))}

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Overflow menu */}
        <OverflowMenu
          onAboutOpen={onAboutOpen}
          onSave={onSave}
          onOpen={onOpen}
        />

        {/* Command palette trigger */}
        <Tooltip content="Command palette (⌘K)">
          <Button variant="ghost" size="icon-sm" onClick={toggleCommandPalette}>
            <Command size={16} />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
