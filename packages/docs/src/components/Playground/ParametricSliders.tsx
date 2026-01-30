"use client";

import { useMemo } from "react";
import * as Slider from "@radix-ui/react-slider";
import type { Document, CsgOp } from "@vcad/ir";

interface ParametricSlidersProps {
  document: Document;
  onUpdate: (nodeId: number, value: number) => void;
}

interface Parameter {
  nodeId: number;
  name: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

function extractParameters(doc: Document): Parameter[] {
  const params: Parameter[] = [];

  for (const [, node] of Object.entries(doc.nodes)) {
    const op = node.op as CsgOp;

    switch (op.type) {
      case "Cube":
        params.push({
          nodeId: node.id,
          name: node.name ?? `cube_${node.id}`,
          label: "Width",
          value: op.size.x,
          min: 1,
          max: 200,
          step: 1,
        });
        params.push({
          nodeId: node.id,
          name: node.name ?? `cube_${node.id}`,
          label: "Depth",
          value: op.size.y,
          min: 1,
          max: 200,
          step: 1,
        });
        params.push({
          nodeId: node.id,
          name: node.name ?? `cube_${node.id}`,
          label: "Height",
          value: op.size.z,
          min: 1,
          max: 200,
          step: 1,
        });
        break;

      case "Cylinder":
        params.push({
          nodeId: node.id,
          name: node.name ?? `cylinder_${node.id}`,
          label: "Radius",
          value: op.radius,
          min: 0.5,
          max: 50,
          step: 0.5,
        });
        params.push({
          nodeId: node.id,
          name: node.name ?? `cylinder_${node.id}`,
          label: "Height",
          value: op.height,
          min: 1,
          max: 100,
          step: 1,
        });
        break;

      case "Sphere":
        params.push({
          nodeId: node.id,
          name: node.name ?? `sphere_${node.id}`,
          label: "Radius",
          value: op.radius,
          min: 1,
          max: 100,
          step: 1,
        });
        break;
    }
  }

  // Limit to first 6 parameters for UX
  return params.slice(0, 6);
}

export function ParametricSliders({ document, onUpdate }: ParametricSlidersProps) {
  const parameters = useMemo(() => extractParameters(document), [document]);

  if (parameters.length === 0) {
    return (
      <div className="p-4 text-sm text-text-muted text-center">
        No adjustable parameters in this model
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide">
        Parameters
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {parameters.map((param, idx) => (
          <div key={`${param.nodeId}-${param.label}-${idx}`} className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">
                {param.name}: {param.label}
              </span>
              <span className="text-text font-medium">
                {param.value.toFixed(param.step < 1 ? 1 : 0)}mm
              </span>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none h-5"
              value={[param.value]}
              min={param.min}
              max={param.max}
              step={param.step}
              onValueChange={([value]) => {
                if (value !== undefined) {
                  onUpdate(param.nodeId, value);
                }
              }}
            >
              <Slider.Track className="relative grow h-1 bg-border rounded-full">
                <Slider.Range className="absolute h-full bg-accent rounded-full" />
              </Slider.Track>
              <Slider.Thumb
                className="block w-4 h-4 bg-text rounded-full shadow-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors cursor-grab active:cursor-grabbing"
                aria-label={`${param.name} ${param.label}`}
              />
            </Slider.Root>
          </div>
        ))}
      </div>
    </div>
  );
}
