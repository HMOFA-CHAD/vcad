import { useState, useEffect, useCallback, useRef } from "react";
import {
  Cube,
  Cylinder,
  Globe,
  Unite,
  Subtract,
  Intersect,
  ArrowsOutCardinal,
  ArrowsClockwise,
  ArrowsOut,
  PencilSimple,
  Package,
  PlusSquare,
  LinkSimple,
  Cube as Cube3D,
  Blueprint,
  Eye,
  EyeSlash,
  Ruler,
  Download,
  MagnifyingGlassPlus,
  X,
  Circle,
  Octagon,
  CubeTransparent,
  DotsThree,
  ArrowsHorizontal,
  Play,
  Pause,
  Stop,
  FastForward,
  Printer,
} from "@phosphor-icons/react";
import { Tooltip } from "@/components/ui/tooltip";
import {
  useDocumentStore,
  useUiStore,
  useSketchStore,
  useEngineStore,
  useSimulationStore,
  type ToolbarTab,
} from "@vcad/core";
import type { PrimitiveKind, BooleanType } from "@vcad/core";
import { downloadDxf } from "@/lib/save-load";
import { useNotificationStore } from "@/stores/notification-store";
import { cn } from "@/lib/utils";
import {
  InsertInstanceDialog,
  AddJointDialog,
  FilletChamferDialog,
  ShellDialog,
  PatternDialog,
  MirrorDialog,
} from "@/components/dialogs";
import { useOnboardingStore, type GuidedFlowStep } from "@/stores/onboarding-store";
import { useDrawingStore, type ViewDirection } from "@/stores/drawing-store";
import { useSlicerStore } from "@/stores/slicer-store";

const VIEW_DIRECTIONS: { value: ViewDirection; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "back", label: "Back" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "isometric", label: "Isometric" },
];

const PRIMITIVES: { kind: PrimitiveKind; icon: typeof Cube; label: string }[] = [
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

const TAB_COLORS: Record<ToolbarTab, string> = {
  create: "text-emerald-400",
  transform: "text-blue-400",
  combine: "text-violet-400",
  modify: "text-amber-400",
  assembly: "text-rose-400",
  simulate: "text-cyan-400",
  view: "text-slate-400",
  print: "text-orange-400",
};

const TABS: { id: ToolbarTab; label: string; icon: typeof Cube }[] = [
  { id: "create", label: "Create", icon: Cube },
  { id: "transform", label: "Transform", icon: ArrowsOutCardinal },
  { id: "combine", label: "Combine", icon: Unite },
  { id: "modify", label: "Modify", icon: Circle },
  { id: "assembly", label: "Assembly", icon: Package },
  { id: "simulate", label: "Simulate", icon: Play },
  { id: "view", label: "View", icon: Cube3D },
  { id: "print", label: "Print", icon: Printer },
];

function ToolbarButton({
  children,
  active,
  disabled,
  onClick,
  tooltip,
  pulse,
  expanded,
  label,
  shortcut,
  iconColor,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  tooltip: string;
  pulse?: boolean;
  expanded?: boolean;
  label?: string;
  shortcut?: string;
  iconColor?: string;
}) {
  return (
    <Tooltip content={tooltip}>
      <button
        className={cn(
          "flex items-center justify-center relative gap-1",
          "h-10 min-w-[40px] px-1.5",
          "sm:h-8 sm:min-w-0",
          expanded ? "sm:px-2" : "sm:px-1.5",
          "disabled:opacity-30 disabled:cursor-not-allowed",
          active && "drop-shadow-lg",
          pulse && "animate-pulse",
        )}
        disabled={disabled}
        onClick={onClick}
      >
        <span className={cn(
          iconColor,
          "transition-transform",
          active && "scale-110",
          !disabled && "hover:scale-110"
        )}>
          {children}
        </span>
        {expanded && label && (
          <span className={cn(
            "hidden sm:inline text-xs whitespace-nowrap",
            active ? "text-text" : "text-text-muted"
          )}>
            {label}
            {shortcut && <span className="ml-1 opacity-60">{shortcut}</span>}
          </span>
        )}
      </button>
    </Tooltip>
  );
}

function TabButton({
  id,
  label,
  icon: Icon,
  active,
  previewing,
  onClick,
  onMouseEnter,
  expanded,
}: {
  id: ToolbarTab;
  label: string;
  icon: typeof Cube;
  active: boolean;
  previewing: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  expanded: boolean;
}) {
  const button = (
    <button
      className={cn(
        "flex items-center justify-center gap-1.5 px-3 py-2 text-xs",
        active && "drop-shadow-lg",
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <Icon
        size={16}
        weight={active || previewing ? "fill" : "regular"}
        className={cn(
          TAB_COLORS[id],
          active && "drop-shadow-sm scale-110",
          previewing && "scale-105",
          "transition-transform"
        )}
      />
      {expanded && (
        <span className={cn(
          "hidden sm:inline font-medium transition-colors",
          active ? "text-text" : "text-text-muted"
        )}>
          {label}
        </span>
      )}
    </button>
  );

  // Show tooltip in compact mode
  if (!expanded) {
    return <Tooltip content={label}>{button}</Tooltip>;
  }

  return button;
}

function Divider() {
  return <div className="w-3" />;
}

export function BottomToolbar() {
  const addPrimitive = useDocumentStore((s) => s.addPrimitive);
  const applyBoolean = useDocumentStore((s) => s.applyBoolean);
  const createPartDef = useDocumentStore((s) => s.createPartDef);
  const document = useDocumentStore((s) => s.document);

  const select = useUiStore((s) => s.select);
  const selectedPartIds = useUiStore((s) => s.selectedPartIds);
  const transformMode = useUiStore((s) => s.transformMode);
  const setTransformMode = useUiStore((s) => s.setTransformMode);
  const toolbarExpanded = useUiStore((s) => s.toolbarExpanded);
  const toolbarTab = useUiStore((s) => s.toolbarTab);
  const setToolbarTab = useUiStore((s) => s.setToolbarTab);

  const enterSketchMode = useSketchStore((s) => s.enterSketchMode);
  const enterFaceSelectionMode = useSketchStore((s) => s.enterFaceSelectionMode);
  const sketchActive = useSketchStore((s) => s.active);
  const faceSelectionMode = useSketchStore((s) => s.faceSelectionMode);
  const parts = useDocumentStore((s) => s.parts);

  const [insertDialogOpen, setInsertDialogOpen] = useState(false);
  const [jointDialogOpen, setJointDialogOpen] = useState(false);
  const [filletDialogOpen, setFilletDialogOpen] = useState(false);
  const [chamferDialogOpen, setChamferDialogOpen] = useState(false);
  const [shellDialogOpen, setShellDialogOpen] = useState(false);
  const [patternDialogOpen, setPatternDialogOpen] = useState(false);
  const [mirrorDialogOpen, setMirrorDialogOpen] = useState(false);

  // Hover preview state - shows tools without committing
  const [hoveredTab, setHoveredTab] = useState<ToolbarTab | null>(null);

  // The tab to display (hovered preview or actual selection)
  const displayedTab = hoveredTab ?? toolbarTab;

  // Drawing view state
  const viewMode = useDrawingStore((s) => s.viewMode);
  const setViewMode = useDrawingStore((s) => s.setViewMode);
  const viewDirection = useDrawingStore((s) => s.viewDirection);
  const setViewDirection = useDrawingStore((s) => s.setViewDirection);
  const showHiddenLines = useDrawingStore((s) => s.showHiddenLines);
  const toggleHiddenLines = useDrawingStore((s) => s.toggleHiddenLines);
  const showDimensions = useDrawingStore((s) => s.showDimensions);
  const toggleDimensions = useDrawingStore((s) => s.toggleDimensions);
  const detailViews = useDrawingStore((s) => s.detailViews);
  const clearDetailViews = useDrawingStore((s) => s.clearDetailViews);

  // Engine for DXF export
  const engine = useEngineStore((s) => s.engine);
  const scene = useEngineStore((s) => s.scene);

  // Simulation state
  const simMode = useSimulationStore((s) => s.mode);
  const physicsAvailable = useSimulationStore((s) => s.physicsAvailable);
  const playbackSpeed = useSimulationStore((s) => s.playbackSpeed);
  const playSim = useSimulationStore((s) => s.play);
  const pauseSim = useSimulationStore((s) => s.pause);
  const stopSim = useSimulationStore((s) => s.stop);
  const stepSim = useSimulationStore((s) => s.step);
  const setPlaybackSpeed = useSimulationStore((s) => s.setPlaybackSpeed);

  // Guided flow state
  const guidedFlowActive = useOnboardingStore((s) => s.guidedFlowActive);
  const guidedFlowStep = useOnboardingStore((s) => s.guidedFlowStep);
  const advanceGuidedFlow = useOnboardingStore((s) => s.advanceGuidedFlow);

  // Helper to check if a button should pulse during guided flow
  function shouldPulse(
    forStep: GuidedFlowStep,
    extraCondition: boolean = true
  ): boolean {
    return guidedFlowActive && guidedFlowStep === forStep && extraCondition;
  }

  // Listen for insert-instance event from command palette
  useEffect(() => {
    function handleInsertInstance() {
      setInsertDialogOpen(true);
    }
    window.addEventListener("vcad:insert-instance", handleInsertInstance);
    return () =>
      window.removeEventListener("vcad:insert-instance", handleInsertInstance);
  }, []);

  const hasSelection = selectedPartIds.size > 0;
  const hasTwoSelected = selectedPartIds.size === 2;

  // Assembly mode detection
  const hasPartDefs = document.partDefs && Object.keys(document.partDefs).length > 0;
  const hasInstances = document.instances && document.instances.length > 0;
  const isAssemblyMode = hasPartDefs || hasInstances;
  const hasJoints = document.joints && document.joints.length > 0;

  // Check if we have one part selected (for create part def)
  const hasOnePartSelected =
    selectedPartIds.size === 1 && parts.some((p) => selectedPartIds.has(p.id));

  // Check if we have two instances selected (for add joint)
  const selectedInstanceIds = Array.from(selectedPartIds).filter((id) =>
    document.instances?.some((i) => i.id === id)
  );
  const hasTwoInstancesSelected = selectedInstanceIds.length === 2;

  // Check if an instance is selected (for assembly tab auto-switch)
  const hasInstanceSelected = Array.from(selectedPartIds).some((id) =>
    document.instances?.some((i) => i.id === id)
  );

  // Get the single selected part ID (for modify operations)
  const selectedPartId = hasOnePartSelected
    ? Array.from(selectedPartIds).find((id) => parts.some((p) => p.id === id))
    : null;

  // Listen for modify operation events from command palette
  useEffect(() => {
    function handleFillet() {
      if (selectedPartId) setFilletDialogOpen(true);
    }
    function handleChamfer() {
      if (selectedPartId) setChamferDialogOpen(true);
    }
    function handleShell() {
      if (selectedPartId) setShellDialogOpen(true);
    }
    function handlePattern() {
      if (selectedPartId) setPatternDialogOpen(true);
    }
    function handleMirror() {
      if (selectedPartId) setMirrorDialogOpen(true);
    }
    window.addEventListener("vcad:apply-fillet", handleFillet);
    window.addEventListener("vcad:apply-chamfer", handleChamfer);
    window.addEventListener("vcad:apply-shell", handleShell);
    window.addEventListener("vcad:apply-pattern", handlePattern);
    window.addEventListener("vcad:apply-mirror", handleMirror);
    return () => {
      window.removeEventListener("vcad:apply-fillet", handleFillet);
      window.removeEventListener("vcad:apply-chamfer", handleChamfer);
      window.removeEventListener("vcad:apply-shell", handleShell);
      window.removeEventListener("vcad:apply-pattern", handlePattern);
      window.removeEventListener("vcad:apply-mirror", handleMirror);
    };
  }, [selectedPartId]);

  // Track manual tab clicks to temporarily disable auto-switch
  const manualOverrideRef = useRef(false);
  const manualOverrideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTabClick = useCallback((tab: ToolbarTab) => {
    // Set manual override for 2 seconds
    manualOverrideRef.current = true;
    if (manualOverrideTimeout.current) {
      clearTimeout(manualOverrideTimeout.current);
    }
    manualOverrideTimeout.current = setTimeout(() => {
      manualOverrideRef.current = false;
    }, 2000);
    setToolbarTab(tab);
  }, [setToolbarTab]);

  // Auto-switch tabs based on context
  const autoSwitchTab = useCallback(() => {
    // Don't auto-switch during guided flow or if user manually changed tabs recently
    if (guidedFlowActive || manualOverrideRef.current) return;

    // Switch to view tab when entering 2D mode
    if (viewMode === "2d") {
      setToolbarTab("view");
      return;
    }

    // Switch to assembly tab when instance is selected
    if (hasInstanceSelected && isAssemblyMode) {
      setToolbarTab("assembly");
      return;
    }

    // Switch to combine tab when exactly 2 parts selected
    if (hasTwoSelected) {
      setToolbarTab("combine");
      return;
    }

    // Switch to transform tab when 1+ parts selected
    if (hasSelection) {
      setToolbarTab("transform");
      return;
    }

    // Default to create when nothing selected
    if (!hasSelection && toolbarTab !== "modify" && toolbarTab !== "simulate" && toolbarTab !== "view") {
      setToolbarTab("create");
    }
  }, [
    guidedFlowActive,
    viewMode,
    hasInstanceSelected,
    isAssemblyMode,
    hasTwoSelected,
    hasSelection,
    toolbarTab,
    setToolbarTab,
  ]);

  // Run auto-switch on relevant state changes
  useEffect(() => {
    autoSwitchTab();
  }, [selectedPartIds.size, viewMode, hasInstanceSelected, autoSwitchTab]);

  function handleAddPrimitive(kind: PrimitiveKind) {
    const partId = addPrimitive(kind);
    select(partId);
    setTransformMode("translate");

    // Advance guided flow if applicable
    if (guidedFlowActive) {
      if (guidedFlowStep === "add-cube" && kind === "cube") {
        advanceGuidedFlow();
      } else if (guidedFlowStep === "add-cylinder" && kind === "cylinder") {
        advanceGuidedFlow();
      }
    }
  }

  function handleBoolean(type: BooleanType) {
    if (!hasTwoSelected) return;
    const ids = Array.from(selectedPartIds);
    const newId = applyBoolean(type, ids[0]!, ids[1]!);
    if (newId) select(newId);

    // Advance guided flow if subtracting during tutorial
    if (guidedFlowActive && guidedFlowStep === "subtract" && type === "difference") {
      advanceGuidedFlow();
    }
  }

  function handleCreatePartDef() {
    if (!hasOnePartSelected) return;
    const partId = Array.from(selectedPartIds)[0]!;
    const partDefId = createPartDef(partId);
    if (partDefId) {
      // Select the newly created instance
      const instance = document.instances?.find((i) => i.partDefId === partDefId);
      if (instance) {
        select(instance.id);
      }
    }
  }

  // Render tab content based on displayed tab (hovered or active)
  const renderTabContent = () => {
    const color = TAB_COLORS[displayedTab];

    switch (displayedTab) {
      case "create":
        return (
          <>
            {PRIMITIVES.map(({ kind, icon: Icon, label }) => (
              <ToolbarButton
                key={kind}
                tooltip={`Add ${label}`}
                disabled={sketchActive}
                onClick={() => handleAddPrimitive(kind)}
                pulse={
                  (kind === "cube" && shouldPulse("add-cube")) ||
                  (kind === "cylinder" && shouldPulse("add-cylinder"))
                }
                expanded={toolbarExpanded}
                label={label}
                iconColor={color}
              >
                <Icon size={20} />
              </ToolbarButton>
            ))}
            <ToolbarButton
              tooltip="New Sketch (S)"
              active={faceSelectionMode}
              disabled={sketchActive}
              onClick={() => {
                if (parts.length > 0) {
                  enterFaceSelectionMode();
                } else {
                  enterSketchMode("XY");
                }
              }}
              expanded={toolbarExpanded}
              label="Sketch"
              shortcut="S"
              iconColor={color}
            >
              <PencilSimple size={20} />
            </ToolbarButton>
          </>
        );

      case "transform":
        return (
          <>
            <ToolbarButton
              tooltip={!hasSelection ? "Move (select a part)" : "Move (M)"}
              active={hasSelection && transformMode === "translate"}
              disabled={!hasSelection || viewMode === "2d"}
              onClick={() => setTransformMode("translate")}
              expanded={toolbarExpanded}
              label="Move"
              shortcut="M"
              iconColor={color}
            >
              <ArrowsOutCardinal size={20} />
            </ToolbarButton>
            <ToolbarButton
              tooltip={!hasSelection ? "Rotate (select a part)" : "Rotate (R)"}
              active={hasSelection && transformMode === "rotate"}
              disabled={!hasSelection || viewMode === "2d"}
              onClick={() => setTransformMode("rotate")}
              expanded={toolbarExpanded}
              label="Rotate"
              shortcut="R"
              iconColor={color}
            >
              <ArrowsClockwise size={20} />
            </ToolbarButton>
            <ToolbarButton
              tooltip={!hasSelection ? "Scale (select a part)" : "Scale (S)"}
              active={hasSelection && transformMode === "scale"}
              disabled={!hasSelection || viewMode === "2d"}
              onClick={() => setTransformMode("scale")}
              expanded={toolbarExpanded}
              label="Scale"
              shortcut="S"
              iconColor={color}
            >
              <ArrowsOut size={20} />
            </ToolbarButton>
          </>
        );

      case "combine":
        return (
          <>
            {BOOLEANS.map(({ type, icon: Icon, label, shortcut }) => (
              <ToolbarButton
                key={type}
                tooltip={!hasTwoSelected ? `${label} (select 2 parts)` : `${label} (${shortcut})`}
                disabled={!hasTwoSelected}
                onClick={() => handleBoolean(type)}
                pulse={type === "difference" && shouldPulse("subtract")}
                expanded={toolbarExpanded}
                label={label}
                shortcut={shortcut}
                iconColor={color}
              >
                <Icon size={20} />
              </ToolbarButton>
            ))}
          </>
        );

      case "modify":
        return (
          <>
            <ToolbarButton
              tooltip={!hasOnePartSelected ? "Fillet (select a part)" : "Fillet"}
              disabled={!hasOnePartSelected || sketchActive}
              onClick={() => setFilletDialogOpen(true)}
              expanded={toolbarExpanded}
              label="Fillet"
              iconColor={color}
            >
              <Circle size={20} />
            </ToolbarButton>
            <ToolbarButton
              tooltip={!hasOnePartSelected ? "Chamfer (select a part)" : "Chamfer"}
              disabled={!hasOnePartSelected || sketchActive}
              onClick={() => setChamferDialogOpen(true)}
              expanded={toolbarExpanded}
              label="Chamfer"
              iconColor={color}
            >
              <Octagon size={20} />
            </ToolbarButton>
            <ToolbarButton
              tooltip={!hasOnePartSelected ? "Shell (select a part)" : "Shell"}
              disabled={!hasOnePartSelected || sketchActive}
              onClick={() => setShellDialogOpen(true)}
              expanded={toolbarExpanded}
              label="Shell"
              iconColor={color}
            >
              <CubeTransparent size={20} />
            </ToolbarButton>
            <ToolbarButton
              tooltip={!hasOnePartSelected ? "Pattern (select a part)" : "Pattern"}
              disabled={!hasOnePartSelected || sketchActive}
              onClick={() => setPatternDialogOpen(true)}
              expanded={toolbarExpanded}
              label="Pattern"
              iconColor={color}
            >
              <DotsThree size={20} />
            </ToolbarButton>
            <ToolbarButton
              tooltip={!hasOnePartSelected ? "Mirror (select a part)" : "Mirror"}
              disabled={!hasOnePartSelected || sketchActive}
              onClick={() => setMirrorDialogOpen(true)}
              expanded={toolbarExpanded}
              label="Mirror"
              iconColor={color}
            >
              <ArrowsHorizontal size={20} />
            </ToolbarButton>
          </>
        );

      case "assembly":
        return (
          <>
            <ToolbarButton
              tooltip={!hasOnePartSelected ? "Create Part Definition (select a part)" : "Create Part Definition"}
              disabled={!hasOnePartSelected || sketchActive}
              onClick={handleCreatePartDef}
              expanded={toolbarExpanded}
              label="Create Part"
              iconColor={color}
            >
              <Package size={20} />
            </ToolbarButton>
            <ToolbarButton
              tooltip={!hasPartDefs ? "Insert Instance (create a part def first)" : "Insert Instance"}
              disabled={!hasPartDefs || sketchActive}
              onClick={() => setInsertDialogOpen(true)}
              expanded={toolbarExpanded}
              label="Insert"
              iconColor={color}
            >
              <PlusSquare size={20} />
            </ToolbarButton>
            <ToolbarButton
              tooltip={!hasTwoInstancesSelected ? "Add Joint (select 2 instances)" : "Add Joint"}
              disabled={!hasTwoInstancesSelected || sketchActive}
              onClick={() => setJointDialogOpen(true)}
              expanded={toolbarExpanded}
              label="Joint"
              iconColor={color}
            >
              <LinkSimple size={20} />
            </ToolbarButton>
          </>
        );

      case "simulate":
        return (
          <>
            <ToolbarButton
              tooltip={
                !hasJoints
                  ? "Play (add joints to simulate)"
                  : simMode === "running"
                  ? "Pause Simulation"
                  : "Play Simulation"
              }
              active={simMode === "running"}
              disabled={!hasJoints || !physicsAvailable || sketchActive}
              onClick={() => {
                if (simMode === "running") {
                  pauseSim();
                } else {
                  playSim();
                }
              }}
              expanded={toolbarExpanded}
              label={simMode === "running" ? "Pause" : "Play"}
              iconColor={color}
            >
              {simMode === "running" ? <Pause size={20} /> : <Play size={20} />}
            </ToolbarButton>
            <ToolbarButton
              tooltip={!hasJoints ? "Stop (add joints to simulate)" : "Stop Simulation"}
              disabled={!hasJoints || simMode === "off" || sketchActive}
              onClick={stopSim}
              expanded={toolbarExpanded}
              label="Stop"
              iconColor={color}
            >
              <Stop size={20} />
            </ToolbarButton>
            <ToolbarButton
              tooltip={!hasJoints ? "Step (add joints to simulate)" : "Step Simulation"}
              disabled={!hasJoints || simMode === "running" || !physicsAvailable || sketchActive}
              onClick={stepSim}
              expanded={toolbarExpanded}
              label="Step"
              iconColor={color}
            >
              <FastForward size={20} />
            </ToolbarButton>
            <div className="flex items-center gap-0.5 px-1">
              <span className="text-xs text-text-muted">{playbackSpeed.toFixed(1)}x</span>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="w-16 h-1 accent-accent"
                title="Playback Speed"
                disabled={!hasJoints}
              />
            </div>
          </>
        );

      case "view":
        return (
          <>
            <ToolbarButton
              tooltip="3D View"
              active={viewMode === "3d"}
              onClick={() => setViewMode("3d")}
              expanded={toolbarExpanded}
              label="3D"
              iconColor={color}
            >
              <Cube3D size={20} />
            </ToolbarButton>
            <ToolbarButton
              tooltip="2D Drawing View"
              active={viewMode === "2d"}
              onClick={() => setViewMode("2d")}
              expanded={toolbarExpanded}
              label="2D"
              iconColor={color}
            >
              <Blueprint size={20} />
            </ToolbarButton>

            {viewMode === "2d" && (
              <>
                <Divider />
                <select
                  value={viewDirection}
                  onChange={(e) => setViewDirection(e.target.value as ViewDirection)}
                  className="h-7 px-1.5 text-xs bg-surface border border-border text-text"
                >
                  {VIEW_DIRECTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ToolbarButton
                  tooltip={showHiddenLines ? "Hide Hidden Lines" : "Show Hidden Lines"}
                  active={showHiddenLines}
                  onClick={toggleHiddenLines}
                  expanded={toolbarExpanded}
                  label="Hidden"
                  iconColor={color}
                >
                  {showHiddenLines ? <Eye size={20} /> : <EyeSlash size={20} />}
                </ToolbarButton>
                <ToolbarButton
                  tooltip={showDimensions ? "Hide Dimensions" : "Show Dimensions"}
                  active={showDimensions}
                  onClick={toggleDimensions}
                  expanded={toolbarExpanded}
                  label="Dims"
                  iconColor={color}
                >
                  <Ruler size={20} />
                </ToolbarButton>
                <Divider />
                <ToolbarButton
                  tooltip="Add Detail View (drag to select region)"
                  disabled={!scene?.parts?.length}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("vcad:start-detail-view"));
                  }}
                  expanded={toolbarExpanded}
                  label="Detail"
                  iconColor={color}
                >
                  <MagnifyingGlassPlus size={20} />
                </ToolbarButton>
                {detailViews.length > 0 && (
                  <ToolbarButton
                    tooltip="Clear Detail Views"
                    onClick={clearDetailViews}
                    expanded={toolbarExpanded}
                    label="Clear"
                    iconColor={color}
                  >
                    <X size={20} />
                  </ToolbarButton>
                )}
                <Divider />
                <ToolbarButton
                  tooltip="Export DXF"
                  disabled={!scene?.parts?.length || !engine}
                  onClick={() => {
                    if (!scene?.parts?.length || !engine) return;
                    try {
                      const mesh = scene.parts[0]!.mesh;
                      const projectedView = engine.projectMesh(mesh, viewDirection);
                      if (!projectedView) {
                        useNotificationStore.getState().addToast("Failed to project view", "error");
                        return;
                      }
                      const dxfData = engine.exportDrawingToDxf(projectedView);
                      downloadDxf(dxfData, `drawing-${viewDirection}.dxf`);
                      useNotificationStore.getState().addToast("DXF exported", "success");
                    } catch (err) {
                      console.error("DXF export failed:", err);
                      useNotificationStore.getState().addToast("DXF export failed", "error");
                    }
                  }}
                  expanded={toolbarExpanded}
                  label="Export"
                  iconColor={color}
                >
                  <Download size={20} />
                </ToolbarButton>
              </>
            )}
          </>
        );

      case "print":
        return (
          <>
            <ToolbarButton
              tooltip={!scene?.parts?.length ? "Print (add geometry first)" : "Open Print Settings"}
              disabled={!scene?.parts?.length || sketchActive}
              onClick={() => {
                useSlicerStore.getState().openPrintPanel();
              }}
              expanded={toolbarExpanded}
              label="Print Settings"
              iconColor={color}
            >
              <Printer size={20} />
            </ToolbarButton>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <InsertInstanceDialog
        open={insertDialogOpen}
        onOpenChange={setInsertDialogOpen}
      />
      <AddJointDialog open={jointDialogOpen} onOpenChange={setJointDialogOpen} />
      {selectedPartId && (
        <>
          <FilletChamferDialog
            open={filletDialogOpen}
            onOpenChange={setFilletDialogOpen}
            mode="fillet"
            partId={selectedPartId}
          />
          <FilletChamferDialog
            open={chamferDialogOpen}
            onOpenChange={setChamferDialogOpen}
            mode="chamfer"
            partId={selectedPartId}
          />
          <ShellDialog
            open={shellDialogOpen}
            onOpenChange={setShellDialogOpen}
            partId={selectedPartId}
          />
          <PatternDialog
            open={patternDialogOpen}
            onOpenChange={setPatternDialogOpen}
            partId={selectedPartId}
          />
          <MirrorDialog
            open={mirrorDialogOpen}
            onOpenChange={setMirrorDialogOpen}
            partId={selectedPartId}
          />
        </>
      )}
      {/* Centered at top, floating with no background */}
      <div
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-auto"
        onMouseLeave={() => setHoveredTab(null)}
      >
        {/* Tabs - floating pills, hover to preview */}
        <div className="flex items-center gap-1">
          {TABS.map(({ id, label, icon }) => (
            <TabButton
              key={id}
              id={id}
              label={label}
              icon={icon}
              active={toolbarTab === id}
              previewing={hoveredTab === id && toolbarTab !== id}
              onClick={() => handleTabClick(id)}
              onMouseEnter={() => setHoveredTab(id)}
              expanded={toolbarExpanded}
            />
          ))}
        </div>

        {/* Tools - appear below active tab */}
        <div className="flex items-center gap-1 px-2 py-1.5">
          {renderTabContent()}
        </div>
      </div>
    </>
  );
}
