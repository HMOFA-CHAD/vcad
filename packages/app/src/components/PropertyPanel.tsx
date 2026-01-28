import { useState, useEffect } from "react";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { Separator } from "@/components/ui/separator";
import { useDocumentStore } from "@/stores/document-store";
import { useUiStore } from "@/stores/ui-store";
import type { Vec3 } from "@vcad/ir";
import type { PartInfo } from "@/types";

function NumericInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(round(value)));

  useEffect(() => {
    setText(String(round(value)));
  }, [value]);

  function commit() {
    const num = parseFloat(text);
    if (!isNaN(num)) {
      onChange(num);
    } else {
      setText(String(round(value)));
    }
  }

  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-5 shrink-0 text-text-muted font-bold">{label}</span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        className="flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-accent w-0"
      />
    </label>
  );
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-1 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
      {children}
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
    <div className="flex flex-col gap-1.5">
      <SectionLabel>Position</SectionLabel>
      <NumericInput
        label="X"
        value={offset.x}
        onChange={(v) =>
          setTranslation(part.id, { ...offset, x: v })
        }
      />
      <NumericInput
        label="Y"
        value={offset.y}
        onChange={(v) =>
          setTranslation(part.id, { ...offset, y: v })
        }
      />
      <NumericInput
        label="Z"
        value={offset.z}
        onChange={(v) =>
          setTranslation(part.id, { ...offset, z: v })
        }
      />
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
    <div className="flex flex-col gap-1.5">
      <SectionLabel>Rotation</SectionLabel>
      <NumericInput
        label="Rx"
        value={angles.x}
        onChange={(v) =>
          setRotation(part.id, { ...angles, x: v })
        }
      />
      <NumericInput
        label="Ry"
        value={angles.y}
        onChange={(v) =>
          setRotation(part.id, { ...angles, y: v })
        }
      />
      <NumericInput
        label="Rz"
        value={angles.z}
        onChange={(v) =>
          setRotation(part.id, { ...angles, z: v })
        }
      />
    </div>
  );
}

function CubeDimensions({
  part,
}: {
  part: PartInfo;
}) {
  const document = useDocumentStore((s) => s.document);
  const updatePrimitiveOp = useDocumentStore((s) => s.updatePrimitiveOp);

  const node = document.nodes[String(part.primitiveNodeId)];
  if (!node || node.op.type !== "Cube") return null;

  const { size } = node.op;

  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel>Dimensions</SectionLabel>
      <NumericInput
        label="W"
        value={size.x}
        onChange={(v) =>
          updatePrimitiveOp(part.id, {
            type: "Cube",
            size: { ...size, x: v },
          })
        }
      />
      <NumericInput
        label="H"
        value={size.y}
        onChange={(v) =>
          updatePrimitiveOp(part.id, {
            type: "Cube",
            size: { ...size, y: v },
          })
        }
      />
      <NumericInput
        label="D"
        value={size.z}
        onChange={(v) =>
          updatePrimitiveOp(part.id, {
            type: "Cube",
            size: { ...size, z: v },
          })
        }
      />
    </div>
  );
}

function CylinderDimensions({
  part,
}: {
  part: PartInfo;
}) {
  const document = useDocumentStore((s) => s.document);
  const updatePrimitiveOp = useDocumentStore((s) => s.updatePrimitiveOp);

  const node = document.nodes[String(part.primitiveNodeId)];
  if (!node || node.op.type !== "Cylinder") return null;

  const op = node.op;

  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel>Dimensions</SectionLabel>
      <NumericInput
        label="R"
        value={op.radius}
        onChange={(v) =>
          updatePrimitiveOp(part.id, { ...op, radius: v })
        }
      />
      <NumericInput
        label="H"
        value={op.height}
        onChange={(v) =>
          updatePrimitiveOp(part.id, { ...op, height: v })
        }
      />
    </div>
  );
}

function SphereDimensions({
  part,
}: {
  part: PartInfo;
}) {
  const document = useDocumentStore((s) => s.document);
  const updatePrimitiveOp = useDocumentStore((s) => s.updatePrimitiveOp);

  const node = document.nodes[String(part.primitiveNodeId)];
  if (!node || node.op.type !== "Sphere") return null;

  const op = node.op;

  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel>Dimensions</SectionLabel>
      <NumericInput
        label="R"
        value={op.radius}
        onChange={(v) =>
          updatePrimitiveOp(part.id, { ...op, radius: v })
        }
      />
    </div>
  );
}

export function PropertyPanel() {
  const selectedPartId = useUiStore((s) => s.selectedPartId);
  const parts = useDocumentStore((s) => s.parts);
  const document = useDocumentStore((s) => s.document);

  const part = parts.find((p) => p.id === selectedPartId);
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
    <Panel side="right">
      <PanelHeader>{part.name}</PanelHeader>
      <PanelBody className="flex flex-col gap-3">
        {/* Dimensions by type */}
        {part.kind === "cube" && <CubeDimensions part={part} />}
        {part.kind === "cylinder" && <CylinderDimensions part={part} />}
        {part.kind === "sphere" && <SphereDimensions part={part} />}

        <Separator />

        <PositionSection part={part} offset={offset} />

        <Separator />

        <RotationSection part={part} angles={angles} />
      </PanelBody>
    </Panel>
  );
}
