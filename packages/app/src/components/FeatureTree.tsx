import { useState, useRef, useEffect, useMemo } from "react";
import { Cube, Cylinder, Globe, Trash, Intersect, CaretRight, CaretDown, ArrowUp, ArrowsClockwise, Spiral, Stack, X, Package, LinkSimple, Anchor } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { ContextMenu } from "@/components/ContextMenu";
import { useDocumentStore, useUiStore, isBooleanPart } from "@vcad/core";
import type { PrimitiveKind, PartInfo, BooleanPartInfo } from "@vcad/core";
import type { PartInstance, Joint, JointKind } from "@vcad/ir";
import { cn } from "@/lib/utils";

const KIND_ICONS: Record<PrimitiveKind, typeof Cube> = {
  cube: Cube,
  cylinder: Cylinder,
  sphere: Globe,
};

function getPartIcon(part: PartInfo): typeof Cube {
  if (part.kind === "boolean") return Intersect;
  if (part.kind === "extrude") return ArrowUp;
  if (part.kind === "revolve") return ArrowsClockwise;
  if (part.kind === "sweep") return Spiral;
  if (part.kind === "loft") return Stack;
  return KIND_ICONS[part.kind];
}

function InlineRenameInput({
  partId,
  currentName,
  onDone,
}: {
  partId: string;
  currentName: string;
  onDone: () => void;
}) {
  const [text, setText] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);
  const renamePart = useDocumentStore((s) => s.renamePart);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  function commit() {
    const trimmed = text.trim();
    if (trimmed && trimmed !== currentName) {
      renamePart(partId, trimmed);
    }
    onDone();
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onDone();
      }}
      className="flex-1 border border-accent bg-surface px-1 py-0.5 text-xs text-text outline-none w-0"
      autoFocus
    />
  );
}

interface TreeNodeProps {
  part: PartInfo;
  depth: number;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  consumedParts: Record<string, PartInfo>;
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
}

function TreeNode({
  part,
  depth,
  expandedIds,
  toggleExpanded,
  consumedParts,
  renamingId,
  setRenamingId,
}: TreeNodeProps) {
  const selectedPartIds = useUiStore((s) => s.selectedPartIds);
  const hoveredPartId = useUiStore((s) => s.hoveredPartId);
  const setHoveredPartId = useUiStore((s) => s.setHoveredPartId);
  const select = useUiStore((s) => s.select);
  const toggleSelect = useUiStore((s) => s.toggleSelect);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const showDeleteConfirm = useUiStore((s) => s.showDeleteConfirm);
  const removePart = useDocumentStore((s) => s.removePart);

  const Icon = getPartIcon(part);
  const isSelected = selectedPartIds.has(part.id);
  const isHovered = hoveredPartId === part.id;
  const isRenaming = renamingId === part.id;

  const isBoolean = isBooleanPart(part);
  const hasChildren = isBoolean && part.sourcePartIds.length > 0;
  const isExpanded = expandedIds.has(part.id);

  const childParts = useMemo(() => {
    if (!isBoolean) return [];
    return (part as BooleanPartInfo).sourcePartIds
      .map((id) => consumedParts[id])
      .filter((p): p is PartInfo => p !== undefined);
  }, [isBoolean, part, consumedParts]);

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1.5 text-xs cursor-pointer",
          isSelected
            ? "bg-accent/20 text-accent"
            : isHovered
              ? "bg-white/10 text-text"
              : "text-text-muted hover:bg-white/10 hover:text-text",
          depth > 0 && "opacity-70",
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={(e) => {
          if (isRenaming) return;
          if (depth > 0) return;
          if (e.shiftKey) {
            toggleSelect(part.id);
          } else {
            select(part.id);
          }
        }}
        onDoubleClick={() => depth === 0 && setRenamingId(part.id)}
        onMouseEnter={() => setHoveredPartId(part.id)}
        onMouseLeave={() => setHoveredPartId(null)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(part.id);
            }}
            className="shrink-0 p-0.5 hover:bg-white/10"
          >
            {isExpanded ? <CaretDown size={10} /> : <CaretRight size={10} />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Icon size={14} className="shrink-0" />
        {isRenaming ? (
          <InlineRenameInput
            partId={part.id}
            currentName={part.name}
            onDone={() => setRenamingId(null)}
          />
        ) : (
          <span className="flex-1 truncate">{part.name}</span>
        )}
        {depth === 0 && (
          <Tooltip content="Delete (Shift+click to skip confirmation)">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-5 w-5 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                if (e.shiftKey) {
                  removePart(part.id);
                  if (isSelected) clearSelection();
                } else {
                  showDeleteConfirm([part.id]);
                }
              }}
            >
              <Trash size={12} />
            </Button>
          </Tooltip>
        )}
      </div>

      {hasChildren && isExpanded && (
        <>
          {childParts.map((child) => (
            <TreeNode
              key={child.id}
              part={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              consumedParts={consumedParts}
              renamingId={renamingId}
              setRenamingId={setRenamingId}
            />
          ))}
        </>
      )}
    </>
  );
}

/** Get a display string for joint type */
function getJointTypeLabel(kind: JointKind): string {
  switch (kind.type) {
    case "Fixed": return "Fixed";
    case "Revolute": return "Revolute";
    case "Slider": return "Slider";
    case "Cylindrical": return "Cylindrical";
    case "Ball": return "Ball";
  }
}

/** Get icon for joint type */
function getJointIcon(kind: JointKind): typeof LinkSimple {
  switch (kind.type) {
    case "Fixed": return Anchor;
    case "Revolute": return ArrowsClockwise;
    case "Slider": return ArrowUp;
    case "Cylindrical": return Spiral;
    case "Ball": return Globe;
  }
}

interface InstanceNodeProps {
  instance: PartInstance;
  joint?: Joint;
  isGround: boolean;
}

function InstanceNode({ instance, joint, isGround }: InstanceNodeProps) {
  const selectedPartIds = useUiStore((s) => s.selectedPartIds);
  const hoveredPartId = useUiStore((s) => s.hoveredPartId);
  const setHoveredPartId = useUiStore((s) => s.setHoveredPartId);
  const select = useUiStore((s) => s.select);
  const toggleSelect = useUiStore((s) => s.toggleSelect);

  const isSelected = selectedPartIds.has(instance.id);
  const isHovered = hoveredPartId === instance.id;

  const displayName = instance.name ?? instance.partDefId;
  const jointSuffix = joint ? ` [${getJointTypeLabel(joint.kind)}]` : isGround ? " (grounded)" : "";

  return (
    <div
      className={cn(
        "group flex items-center gap-1 px-2 py-1.5 text-xs cursor-pointer",
        isSelected
          ? "bg-accent/20 text-accent"
          : isHovered
            ? "bg-white/10 text-text"
            : "text-text-muted hover:bg-white/10 hover:text-text",
      )}
      style={{ paddingLeft: "24px" }}
      onClick={(e) => {
        if (e.shiftKey) {
          toggleSelect(instance.id);
        } else {
          select(instance.id);
        }
      }}
      onMouseEnter={() => setHoveredPartId(instance.id)}
      onMouseLeave={() => setHoveredPartId(null)}
    >
      <Package size={14} className="shrink-0" />
      <span className="flex-1 truncate">
        {displayName}
        <span className="text-text-muted/70">{jointSuffix}</span>
      </span>
    </div>
  );
}

interface JointNodeProps {
  joint: Joint;
  instancesById: Map<string, PartInstance>;
}

function JointNode({ joint, instancesById }: JointNodeProps) {
  const selectedPartIds = useUiStore((s) => s.selectedPartIds);
  const hoveredPartId = useUiStore((s) => s.hoveredPartId);
  const setHoveredPartId = useUiStore((s) => s.setHoveredPartId);
  const select = useUiStore((s) => s.select);
  const toggleSelect = useUiStore((s) => s.toggleSelect);

  // Use joint.id prefixed with "joint:" to distinguish from instances
  const jointSelectionId = `joint:${joint.id}`;
  const isSelected = selectedPartIds.has(jointSelectionId);
  const isHovered = hoveredPartId === jointSelectionId;

  const Icon = getJointIcon(joint.kind);
  const parentName = joint.parentInstanceId
    ? instancesById.get(joint.parentInstanceId)?.name ?? joint.parentInstanceId
    : "Ground";
  const childName = instancesById.get(joint.childInstanceId)?.name ?? joint.childInstanceId;
  const displayName = joint.name ?? `${getJointTypeLabel(joint.kind)} Joint`;

  // Show state value for non-fixed joints
  let stateDisplay = "";
  if (joint.kind.type === "Revolute") {
    stateDisplay = ` ${joint.state.toFixed(0)}°`;
  } else if (joint.kind.type === "Slider") {
    stateDisplay = ` ${joint.state.toFixed(1)}mm`;
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-1 px-2 py-1.5 text-xs cursor-pointer",
        isSelected
          ? "bg-accent/20 text-accent"
          : isHovered
            ? "bg-white/10 text-text"
            : "text-text-muted hover:bg-white/10 hover:text-text",
      )}
      style={{ paddingLeft: "24px" }}
      onClick={(e) => {
        if (e.shiftKey) {
          toggleSelect(jointSelectionId);
        } else {
          select(jointSelectionId);
        }
      }}
      onMouseEnter={() => setHoveredPartId(jointSelectionId)}
      onMouseLeave={() => setHoveredPartId(null)}
    >
      <Icon size={14} className="shrink-0" />
      <span className="flex-1 truncate">
        {displayName}
        <span className="text-text-muted/70">{stateDisplay}</span>
      </span>
      <Tooltip content={`${parentName} → ${childName}`} side="right">
        <LinkSimple size={12} className="shrink-0 text-text-muted/50" />
      </Tooltip>
    </div>
  );
}

interface AssemblyTreeProps {
  instances: PartInstance[];
  joints: Joint[];
  groundInstanceId?: string;
}

function AssemblyTree({ instances, joints, groundInstanceId }: AssemblyTreeProps) {
  const instancesById = useMemo(
    () => new Map(instances.map((i) => [i.id, i])),
    [instances]
  );

  // Build map of child instance -> joint
  const jointByChild = useMemo(
    () => new Map(joints.map((j) => [j.childInstanceId, j])),
    [joints]
  );

  return (
    <div className="space-y-1">
      {/* Section header: Instances */}
      <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted px-2 pt-2">
        Instances
      </div>
      {instances.map((instance) => (
        <InstanceNode
          key={instance.id}
          instance={instance}
          joint={jointByChild.get(instance.id)}
          isGround={instance.id === groundInstanceId}
        />
      ))}

      {/* Section header: Joints (if any) */}
      {joints.length > 0 && (
        <>
          <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted px-2 pt-3">
            Joints
          </div>
          {joints.map((joint) => (
            <JointNode
              key={joint.id}
              joint={joint}
              instancesById={instancesById}
            />
          ))}
        </>
      )}
    </div>
  );
}

export function FeatureTree() {
  const parts = useDocumentStore((s) => s.parts);
  const consumedParts = useDocumentStore((s) => s.consumedParts);
  const document = useDocumentStore((s) => s.document);
  const featureTreeOpen = useUiStore((s) => s.featureTreeOpen);
  const setFeatureTreeOpen = useUiStore((s) => s.setFeatureTreeOpen);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Check if this is an assembly document
  const hasInstances = document.instances && document.instances.length > 0;

  useEffect(() => {
    function handleRename() {
      const { selectedPartIds } = useUiStore.getState();
      if (selectedPartIds.size === 1) {
        setRenamingId(Array.from(selectedPartIds)[0]!);
      }
    }
    window.addEventListener("vcad:rename-part", handleRename);
    return () => window.removeEventListener("vcad:rename-part", handleRename);
  }, []);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (!featureTreeOpen) return null;

  return (
    <div
      className={cn(
        "absolute top-14 left-3 z-20 w-56",
        "border border-border",
        "bg-surface",
        "shadow-lg shadow-black/30",
        "max-h-[calc(100vh-120px)] flex flex-col"
      )}
    >
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Features
        </span>
        <button
          onClick={() => setFeatureTreeOpen(false)}
          className="flex h-6 w-6 items-center justify-center text-text-muted hover:text-text hover:bg-white/10"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        <ContextMenu>
          <div>
            {/* Assembly mode: show instances and joints */}
            {hasInstances ? (
              <AssemblyTree
                instances={document.instances!}
                joints={document.joints ?? []}
                groundInstanceId={document.groundInstanceId}
              />
            ) : (
              <>
                {/* Legacy mode: show parts */}
                {parts.length === 0 && (
                  <div className="px-2 py-4 text-center text-xs text-text-muted">
                    no parts yet — add one from the toolbar
                  </div>
                )}
                {parts.map((part) => (
                  <TreeNode
                    key={part.id}
                    part={part}
                    depth={0}
                    expandedIds={expandedIds}
                    toggleExpanded={toggleExpanded}
                    consumedParts={consumedParts}
                    renamingId={renamingId}
                    setRenamingId={setRenamingId}
                  />
                ))}
              </>
            )}
          </div>
        </ContextMenu>
      </div>
    </div>
  );
}
