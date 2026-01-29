import { useEffect, useRef, useMemo } from "react";
import { X } from "@phosphor-icons/react";
import { Tooltip } from "@/components/ui/tooltip";
import { ScrubInput } from "@/components/ui/scrub-input";
import { useDocumentStore, useUiStore, isPrimitivePart } from "@vcad/core";
import type { PartInfo, PrimitivePartInfo } from "@vcad/core";
import type { Vec3, PartInstance, Joint, JointKind } from "@vcad/ir";
import { identityTransform } from "@vcad/ir";
import { cn } from "@/lib/utils";

const MATERIAL_SWATCHES = [
  { key: "default", label: "Default", color: "#b3b3bf" },
  { key: "red", label: "Red", color: "#ef4444" },
  { key: "blue", label: "Blue", color: "#3b82f6" },
  { key: "green", label: "Green", color: "#22c55e" },
  { key: "orange", label: "Orange", color: "#f97316" },
  { key: "purple", label: "Purple", color: "#a855f7" },
];

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

function SectionHeader({ children, tooltip }: { children: string; tooltip?: string }) {
  const content = (
    <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted pt-2 pb-1">
      {children}
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip content={tooltip} side="left">
        <div className="cursor-help">{content}</div>
      </Tooltip>
    );
  }
  return content;
}

function PartTypeBadge({ kind }: { kind: string }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 bg-white/10 border border-border/50 text-text-muted uppercase tracking-wide">
      {kind}
    </span>
  );
}

function MaterialPicker({ partId }: { partId: string }) {
  const document = useDocumentStore((s) => s.document);
  const setPartMaterial = useDocumentStore((s) => s.setPartMaterial);
  const parts = useDocumentStore((s) => s.parts);
  const part = parts.find((p) => p.id === partId);
  if (!part) return null;

  const rootEntry = document.roots.find((r) => r.root === part.translateNodeId);
  const currentMaterial = rootEntry?.material ?? "default";

  function handleSelect(swatch: (typeof MATERIAL_SWATCHES)[number]) {
    const state = useDocumentStore.getState();
    const newDoc = structuredClone(state.document);
    if (!newDoc.materials[swatch.key]) {
      const rgb = hexToRgb(swatch.color);
      newDoc.materials[swatch.key] = {
        name: swatch.label,
        color: rgb,
        metallic: 0.1,
        roughness: 0.6,
      };
    }
    setPartMaterial(partId, swatch.key);
  }

  return (
    <div>
      <SectionHeader tooltip="Assign a material color to this part">Material</SectionHeader>
      <div className="flex gap-1.5">
        {MATERIAL_SWATCHES.map((swatch) => (
          <Tooltip key={swatch.key} content={swatch.label} side="bottom">
            <button
              className={`h-5 w-5 rounded-full border-2 cursor-pointer ${
                currentMaterial === swatch.key
                  ? "border-accent"
                  : "border-transparent hover:border-border"
              }`}
              style={{ backgroundColor: swatch.color }}
              onClick={() => handleSelect(swatch)}
            />
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function PositionSection({
  part,
  offset,
}: {
  part: PartInfo;
  offset: Vec3;
}) {
  const setTranslation = useDocumentStore((s) => s.setTranslation);

  return (
    <div>
      <SectionHeader tooltip="Position offset from origin (mm)">Position</SectionHeader>
      <div className="space-y-0.5">
        <ScrubInput
          label="X"
          value={offset.x}
          onChange={(v) => setTranslation(part.id, { ...offset, x: v })}
        />
        <ScrubInput
          label="Y"
          value={offset.y}
          onChange={(v) => setTranslation(part.id, { ...offset, y: v })}
        />
        <ScrubInput
          label="Z"
          value={offset.z}
          onChange={(v) => setTranslation(part.id, { ...offset, z: v })}
        />
      </div>
    </div>
  );
}

function RotationSection({
  part,
  angles,
}: {
  part: PartInfo;
  angles: Vec3;
}) {
  const setRotation = useDocumentStore((s) => s.setRotation);

  return (
    <div>
      <SectionHeader tooltip="Rotation angles around each axis (degrees)">Rotation</SectionHeader>
      <div className="space-y-0.5">
        <ScrubInput
          label="X"
          value={angles.x}
          step={1}
          onChange={(v) => setRotation(part.id, { ...angles, x: v })}
        />
        <ScrubInput
          label="Y"
          value={angles.y}
          step={1}
          onChange={(v) => setRotation(part.id, { ...angles, y: v })}
        />
        <ScrubInput
          label="Z"
          value={angles.z}
          step={1}
          onChange={(v) => setRotation(part.id, { ...angles, z: v })}
        />
      </div>
    </div>
  );
}

function CubeDimensions({ part }: { part: PrimitivePartInfo }) {
  const document = useDocumentStore((s) => s.document);
  const updatePrimitiveOp = useDocumentStore((s) => s.updatePrimitiveOp);

  const node = document.nodes[String(part.primitiveNodeId)];
  if (!node || node.op.type !== "Cube") return null;

  const { size } = node.op;

  return (
    <div>
      <SectionHeader tooltip="Width, height, and depth of the box (mm)">Dimensions</SectionHeader>
      <div className="space-y-0.5">
        <ScrubInput
          label="W"
          value={size.x}
          min={0.1}
          onChange={(v) =>
            updatePrimitiveOp(part.id, { type: "Cube", size: { ...size, x: v } })
          }
        />
        <ScrubInput
          label="H"
          value={size.y}
          min={0.1}
          onChange={(v) =>
            updatePrimitiveOp(part.id, { type: "Cube", size: { ...size, y: v } })
          }
        />
        <ScrubInput
          label="D"
          value={size.z}
          min={0.1}
          onChange={(v) =>
            updatePrimitiveOp(part.id, { type: "Cube", size: { ...size, z: v } })
          }
        />
      </div>
    </div>
  );
}

function CylinderDimensions({ part }: { part: PrimitivePartInfo }) {
  const document = useDocumentStore((s) => s.document);
  const updatePrimitiveOp = useDocumentStore((s) => s.updatePrimitiveOp);

  const node = document.nodes[String(part.primitiveNodeId)];
  if (!node || node.op.type !== "Cylinder") return null;

  const op = node.op;

  return (
    <div>
      <SectionHeader tooltip="Radius and height of the cylinder (mm)">Dimensions</SectionHeader>
      <div className="space-y-0.5">
        <ScrubInput
          label="R"
          value={op.radius}
          min={0.1}
          onChange={(v) => updatePrimitiveOp(part.id, { ...op, radius: v })}
        />
        <ScrubInput
          label="H"
          value={op.height}
          min={0.1}
          onChange={(v) => updatePrimitiveOp(part.id, { ...op, height: v })}
        />
      </div>
    </div>
  );
}

function SphereDimensions({ part }: { part: PrimitivePartInfo }) {
  const document = useDocumentStore((s) => s.document);
  const updatePrimitiveOp = useDocumentStore((s) => s.updatePrimitiveOp);

  const node = document.nodes[String(part.primitiveNodeId)];
  if (!node || node.op.type !== "Sphere") return null;

  const op = node.op;

  return (
    <div>
      <SectionHeader tooltip="Radius of the sphere (mm)">Dimensions</SectionHeader>
      <div className="space-y-0.5">
        <ScrubInput
          label="R"
          value={op.radius}
          min={0.1}
          onChange={(v) => updatePrimitiveOp(part.id, { ...op, radius: v })}
        />
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border my-2" />;
}

// --- Instance Properties ---

function InstanceMaterialPicker({ instanceId }: { instanceId: string }) {
  const document = useDocumentStore((s) => s.document);
  const setInstanceMaterial = useDocumentStore((s) => s.setInstanceMaterial);

  const instance = document.instances?.find((i) => i.id === instanceId);
  const partDef = instance ? document.partDefs?.[instance.partDefId] : undefined;
  const currentMaterial = instance?.material ?? partDef?.defaultMaterial ?? "default";

  function handleSelect(swatch: (typeof MATERIAL_SWATCHES)[number]) {
    const state = useDocumentStore.getState();
    const newDoc = structuredClone(state.document);
    if (!newDoc.materials[swatch.key]) {
      const rgb = hexToRgb(swatch.color);
      newDoc.materials[swatch.key] = {
        name: swatch.label,
        color: rgb,
        metallic: 0.1,
        roughness: 0.6,
      };
    }
    setInstanceMaterial(instanceId, swatch.key);
  }

  return (
    <div>
      <SectionHeader tooltip="Assign a material color to this instance">Material</SectionHeader>
      <div className="flex gap-1.5">
        {MATERIAL_SWATCHES.map((swatch) => (
          <Tooltip key={swatch.key} content={swatch.label} side="bottom">
            <button
              className={`h-5 w-5 rounded-full border-2 cursor-pointer ${
                currentMaterial === swatch.key
                  ? "border-accent"
                  : "border-transparent hover:border-border"
              }`}
              style={{ backgroundColor: swatch.color }}
              onClick={() => handleSelect(swatch)}
            />
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function InstancePositionSection({ instance }: { instance: PartInstance }) {
  const setInstanceTransform = useDocumentStore((s) => s.setInstanceTransform);
  const t = instance.transform ?? identityTransform();

  return (
    <div>
      <SectionHeader tooltip="Position in world space (mm)">Position</SectionHeader>
      <div className="space-y-0.5">
        <ScrubInput
          label="X"
          value={t.translation.x}
          onChange={(v) => setInstanceTransform(instance.id, { ...t, translation: { ...t.translation, x: v } })}
        />
        <ScrubInput
          label="Y"
          value={t.translation.y}
          onChange={(v) => setInstanceTransform(instance.id, { ...t, translation: { ...t.translation, y: v } })}
        />
        <ScrubInput
          label="Z"
          value={t.translation.z}
          onChange={(v) => setInstanceTransform(instance.id, { ...t, translation: { ...t.translation, z: v } })}
        />
      </div>
    </div>
  );
}

function InstanceRotationSection({ instance }: { instance: PartInstance }) {
  const setInstanceTransform = useDocumentStore((s) => s.setInstanceTransform);
  const t = instance.transform ?? identityTransform();

  return (
    <div>
      <SectionHeader tooltip="Rotation angles in world space (degrees)">Rotation</SectionHeader>
      <div className="space-y-0.5">
        <ScrubInput
          label="X"
          value={t.rotation.x}
          step={1}
          onChange={(v) => setInstanceTransform(instance.id, { ...t, rotation: { ...t.rotation, x: v } })}
        />
        <ScrubInput
          label="Y"
          value={t.rotation.y}
          step={1}
          onChange={(v) => setInstanceTransform(instance.id, { ...t, rotation: { ...t.rotation, y: v } })}
        />
        <ScrubInput
          label="Z"
          value={t.rotation.z}
          step={1}
          onChange={(v) => setInstanceTransform(instance.id, { ...t, rotation: { ...t.rotation, z: v } })}
        />
      </div>
    </div>
  );
}

function InstancePropertiesPanel({ instance }: { instance: PartInstance }) {
  const document = useDocumentStore((s) => s.document);
  const clearSelection = useUiStore((s) => s.clearSelection);

  const partDef = document.partDefs?.[instance.partDefId];
  const displayName = instance.name ?? partDef?.name ?? instance.partDefId;

  return (
    <div
      className={cn(
        "absolute top-14 right-3 z-20 w-60",
        "border border-border",
        "bg-surface",
        "shadow-lg shadow-black/30",
        "max-h-[calc(100vh-120px)] flex flex-col"
      )}
    >
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-text truncate">
            {displayName}
          </span>
          <PartTypeBadge kind="instance" />
        </div>
        <button
          onClick={clearSelection}
          className="flex h-6 w-6 shrink-0 items-center justify-center text-text-muted hover:text-text hover:bg-white/10"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
        {/* Part definition (read-only) */}
        <div>
          <SectionHeader>Part Definition</SectionHeader>
          <div className="text-xs text-text">{partDef?.name ?? instance.partDefId}</div>
        </div>
        <Divider />

        <InstancePositionSection instance={instance} />
        <Divider />
        <InstanceRotationSection instance={instance} />
        <Divider />
        <InstanceMaterialPicker instanceId={instance.id} />
      </div>
    </div>
  );
}

// --- Joint Properties ---

function getJointTypeLabel(kind: JointKind): string {
  switch (kind.type) {
    case "Fixed": return "Fixed";
    case "Revolute": return "Revolute";
    case "Slider": return "Slider";
    case "Cylindrical": return "Cylindrical";
    case "Ball": return "Ball";
  }
}

function JointStateSlider({ joint }: { joint: Joint }) {
  const setJointState = useDocumentStore((s) => s.setJointState);
  const kind = joint.kind;

  // Get limits and labels based on joint type
  let min = -180;
  let max = 180;
  let step = 1;
  let unit = "°";

  if (kind.type === "Revolute") {
    if (kind.limits) {
      [min, max] = kind.limits;
    }
    unit = "°";
  } else if (kind.type === "Slider") {
    if (kind.limits) {
      [min, max] = kind.limits;
    } else {
      min = 0;
      max = 100;
    }
    step = 0.5;
    unit = "mm";
  } else if (kind.type === "Cylindrical") {
    // Cylindrical uses rotation for state
    unit = "°";
  } else if (kind.type === "Ball") {
    unit = "°";
  } else {
    // Fixed joint has no state
    return null;
  }

  return (
    <div>
      <SectionHeader tooltip="Current joint state value">State</SectionHeader>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={joint.state}
          onChange={(e) => setJointState(joint.id, Number(e.target.value))}
          className="flex-1 h-1 bg-border rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <span className="text-xs text-text tabular-nums w-16 text-right">
          {joint.state.toFixed(kind.type === "Slider" ? 1 : 0)}{unit}
        </span>
      </div>
      <div className="flex justify-between text-[10px] text-text-muted mt-1">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

function JointPropertiesPanel({ joint }: { joint: Joint }) {
  const document = useDocumentStore((s) => s.document);
  const clearSelection = useUiStore((s) => s.clearSelection);

  const instancesById = useMemo(
    () => new Map(document.instances?.map((i) => [i.id, i]) ?? []),
    [document.instances]
  );

  const parentName = joint.parentInstanceId
    ? instancesById.get(joint.parentInstanceId)?.name ?? joint.parentInstanceId
    : "Ground";
  const childInstance = instancesById.get(joint.childInstanceId);
  const childName = childInstance?.name ?? joint.childInstanceId;
  const displayName = joint.name ?? `${getJointTypeLabel(joint.kind)} Joint`;

  return (
    <div
      className={cn(
        "absolute top-14 right-3 z-20 w-60",
        "border border-border",
        "bg-surface",
        "shadow-lg shadow-black/30",
        "max-h-[calc(100vh-120px)] flex flex-col"
      )}
    >
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-text truncate">
            {displayName}
          </span>
          <PartTypeBadge kind="joint" />
        </div>
        <button
          onClick={clearSelection}
          className="flex h-6 w-6 shrink-0 items-center justify-center text-text-muted hover:text-text hover:bg-white/10"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
        {/* Joint type (read-only) */}
        <div>
          <SectionHeader>Type</SectionHeader>
          <div className="text-xs text-text">{getJointTypeLabel(joint.kind)}</div>
        </div>
        <Divider />

        {/* Connection info */}
        <div>
          <SectionHeader>Connection</SectionHeader>
          <div className="text-xs text-text">
            <span className="text-text-muted">Parent:</span> {parentName}
          </div>
          <div className="text-xs text-text">
            <span className="text-text-muted">Child:</span> {childName}
          </div>
        </div>
        <Divider />

        {/* State slider for non-fixed joints */}
        {joint.kind.type !== "Fixed" && (
          <>
            <JointStateSlider joint={joint} />
          </>
        )}
      </div>
    </div>
  );
}

export function PropertyPanel() {
  const selectedPartIds = useUiStore((s) => s.selectedPartIds);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const parts = useDocumentStore((s) => s.parts);
  const document = useDocumentStore((s) => s.document);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && selectedPartIds.size > 0) {
        clearSelection();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPartIds.size, clearSelection]);

  if (selectedPartIds.size === 0) return null;

  // Check if the selection is an instance or joint (assembly mode)
  if (selectedPartIds.size === 1) {
    const singleId = Array.from(selectedPartIds)[0]!;

    // Check for joint selection (prefixed with "joint:")
    if (singleId.startsWith("joint:")) {
      const jointId = singleId.slice(6); // Remove "joint:" prefix
      const joint = document.joints?.find((j) => j.id === jointId);
      if (joint) {
        return <JointPropertiesPanel joint={joint} />;
      }
    }

    // Check for instance selection
    const instance = document.instances?.find((i) => i.id === singleId);
    if (instance) {
      return <InstancePropertiesPanel instance={instance} />;
    }
  }

  if (selectedPartIds.size > 1) {
    return (
      <div
        ref={panelRef}
        className={cn(
          "absolute top-14 right-3 z-20 w-60",
          "border border-border",
          "bg-surface",
          "shadow-lg shadow-black/30"
        )}
      >
        <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
          <span className="text-xs font-medium text-text">
            {selectedPartIds.size} parts selected
          </span>
          <button
            onClick={clearSelection}
            className="flex h-6 w-6 items-center justify-center text-text-muted hover:text-text hover:bg-white/10"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-3 text-[10px] text-text-muted">
          Select a single part to edit properties
        </div>
      </div>
    );
  }

  const singleId = Array.from(selectedPartIds)[0]!;
  const part = parts.find((p) => p.id === singleId);
  if (!part) return null;

  const translateNode = document.nodes[String(part.translateNodeId)];
  const rotateNode = document.nodes[String(part.rotateNodeId)];

  const offset =
    translateNode?.op.type === "Translate"
      ? translateNode.op.offset
      : { x: 0, y: 0, z: 0 };

  const angles =
    rotateNode?.op.type === "Rotate"
      ? rotateNode.op.angles
      : { x: 0, y: 0, z: 0 };

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute top-14 right-3 z-20 w-60",
        "border border-border",
        "bg-surface",
        "shadow-lg shadow-black/30",
        "max-h-[calc(100vh-120px)] flex flex-col"
      )}
    >
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-text truncate">
            {part.name}
          </span>
          <PartTypeBadge kind={part.kind} />
        </div>
        <button
          onClick={clearSelection}
          className="flex h-6 w-6 shrink-0 items-center justify-center text-text-muted hover:text-text hover:bg-white/10"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
        {/* Dimensions by type (primitives only) */}
        {isPrimitivePart(part) && part.kind === "cube" && (
          <>
            <CubeDimensions part={part} />
            <Divider />
          </>
        )}
        {isPrimitivePart(part) && part.kind === "cylinder" && (
          <>
            <CylinderDimensions part={part} />
            <Divider />
          </>
        )}
        {isPrimitivePart(part) && part.kind === "sphere" && (
          <>
            <SphereDimensions part={part} />
            <Divider />
          </>
        )}

        {/* Boolean type info */}
        {part.kind === "boolean" && (
          <>
            <div>
              <SectionHeader>Operation</SectionHeader>
              <div className="text-xs text-text capitalize">{part.booleanType}</div>
            </div>
            <Divider />
          </>
        )}

        <PositionSection part={part} offset={offset} />
        <Divider />
        <RotationSection part={part} angles={angles} />
        <Divider />
        <MaterialPicker partId={part.id} />
      </div>
    </div>
  );
}
