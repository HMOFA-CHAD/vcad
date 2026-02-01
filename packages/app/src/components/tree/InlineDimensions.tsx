import { ScrubInput } from "@/components/ui/scrub-input";
import { useDocumentStore } from "@vcad/core";
import type { PrimitivePartInfo } from "@vcad/core";

interface InlineCubeDimensionsProps {
  part: PrimitivePartInfo;
}

export function InlineCubeDimensions({ part }: InlineCubeDimensionsProps) {
  const document = useDocumentStore((s) => s.document);
  const updatePrimitiveOp = useDocumentStore((s) => s.updatePrimitiveOp);

  const node = document.nodes[String(part.primitiveNodeId)];
  if (!node || node.op.type !== "Cube") return null;

  const { size } = node.op;

  return (
    <div className="grid grid-cols-3 gap-1 px-2 pb-1">
      <ScrubInput
        label="W"
        value={size.x}
        min={0.1}
        onChange={(v) =>
          updatePrimitiveOp(part.id, { type: "Cube", size: { ...size, x: v } })
        }
        unit="mm"
        compact
      />
      <ScrubInput
        label="H"
        value={size.y}
        min={0.1}
        onChange={(v) =>
          updatePrimitiveOp(part.id, { type: "Cube", size: { ...size, y: v } })
        }
        unit="mm"
        compact
      />
      <ScrubInput
        label="D"
        value={size.z}
        min={0.1}
        onChange={(v) =>
          updatePrimitiveOp(part.id, { type: "Cube", size: { ...size, z: v } })
        }
        unit="mm"
        compact
      />
    </div>
  );
}

interface InlineCylinderDimensionsProps {
  part: PrimitivePartInfo;
}

export function InlineCylinderDimensions({ part }: InlineCylinderDimensionsProps) {
  const document = useDocumentStore((s) => s.document);
  const updatePrimitiveOp = useDocumentStore((s) => s.updatePrimitiveOp);

  const node = document.nodes[String(part.primitiveNodeId)];
  if (!node || node.op.type !== "Cylinder") return null;

  const op = node.op;

  return (
    <div className="grid grid-cols-2 gap-1 px-2 pb-1">
      <ScrubInput
        label="R"
        value={op.radius}
        min={0.1}
        onChange={(v) => updatePrimitiveOp(part.id, { ...op, radius: v })}
        unit="mm"
        compact
      />
      <ScrubInput
        label="H"
        value={op.height}
        min={0.1}
        onChange={(v) => updatePrimitiveOp(part.id, { ...op, height: v })}
        unit="mm"
        compact
      />
    </div>
  );
}

interface InlineSphereDimensionsProps {
  part: PrimitivePartInfo;
}

export function InlineSphereDimensions({ part }: InlineSphereDimensionsProps) {
  const document = useDocumentStore((s) => s.document);
  const updatePrimitiveOp = useDocumentStore((s) => s.updatePrimitiveOp);

  const node = document.nodes[String(part.primitiveNodeId)];
  if (!node || node.op.type !== "Sphere") return null;

  const op = node.op;

  return (
    <div className="grid grid-cols-1 gap-1 px-2 pb-1 max-w-[100px]">
      <ScrubInput
        label="R"
        value={op.radius}
        min={0.1}
        onChange={(v) => updatePrimitiveOp(part.id, { ...op, radius: v })}
        unit="mm"
        compact
      />
    </div>
  );
}
